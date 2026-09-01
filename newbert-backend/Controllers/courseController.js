const Course = require("../Models/Course");
const CourseReview = require("../Models/CourseReview");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const User = require("../Models/User");
const Alumni = require("../Models/Alumni");
const {
  calculateCourseFit,
  buildPersonalizedRecommendations,
  extractStudentGaps,
} = require("../services/courseRecommendationService");
const { analyzeCourse } = require("../services/courseAnalysisService");

const list = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 50)
    : [];

const validUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

async function context(userId) {
  const [profile, plan] = await Promise.all([
    Profile.findOne({ userId }).lean(),
    Plan.findOne({ userId }).lean(),
  ]);
  return { profile: profile || {}, plan };
}

async function reviewMap(courseIds) {
  const reviews = await CourseReview.find({ courseId: { $in: courseIds }, hidden: false }).lean();
  return reviews.reduce((map, review) => {
    const key = String(review.courseId);
    map.set(key, [...(map.get(key) || []), review]);
    return map;
  }, new Map());
}

/**
 * GET /api/courses/recommended
 * Returns personalized top picks (Best Match, Fastest Gap Closer, Best Free Option, No Course Required)
 */
exports.getRecommendedCourses = async (req, res, next) => {
  try {
    const { profile, plan } = await context(req.auth.id);
    const courses = await Course.find({ active: true }).lean();
    const reviews = await reviewMap(courses.map((c) => c._id));

    const recommendations = buildPersonalizedRecommendations(courses, profile, plan, reviews);
    const studentGaps = extractStudentGaps(plan, profile);

    return res.json({
      ...recommendations,
      context: {
        goal: plan?.target?.role || profile.targetRole || "Software Engineer",
        targetType: plan?.target?.type || "placement",
        priorityGaps: studentGaps.slice(0, 6),
        skills: (profile.skills || []).slice(0, 8),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/courses/:courseId/fit
 * Returns explainable deterministic fit breakdown for a single course
 */
exports.getCourseFit = async (req, res, next) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, active: true }).lean();
    if (!course) return res.status(404).json({ message: "Course not found." });

    const { profile, plan } = await context(req.auth.id);
    const reviews = await CourseReview.find({ courseId: course._id, hidden: false }).lean();
    const fit = calculateCourseFit(course, profile, plan, reviews);

    return res.json({
      courseId: course._id,
      title: course.title,
      ...fit,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/courses
 * Filtered & personalized course catalog
 */
exports.listCourses = async (req, res, next) => {
  try {
    const query = { active: true };
    if (req.query.category && !["For You", "All", "Free"].includes(req.query.category)) {
      query.category = req.query.category;
    }
    if (req.query.free === "true" || req.query.category === "Free") {
      query.priceType = "free";
    }
    if (req.query.level && req.query.level !== "all") {
      query.level = req.query.level;
    }

    const courses = await Course.find(query).lean();
    const { profile, plan } = await context(req.auth.id);
    const reviews = await reviewMap(courses.map((c) => c._id));
    const search = String(req.query.search || "").toLowerCase();

    const results = courses
      .filter((course) => {
        if (!search) return true;
        const haystack = `${course.title} ${course.provider} ${course.category} ${(course.skillsCovered || []).join(" ")} ${(course.topicsCovered || []).join(" ")}`.toLowerCase();
        return haystack.includes(search);
      })
      .map((course) => {
        const fit = calculateCourseFit(course, profile, plan, reviews.get(String(course._id)) || []);
        return {
          course,
          match: {
            score: fit.fitScore,
            fitLabel: fit.fitLabel,
            recommendation: fit.fitLabel,
            missingSkills: fit.coveredGaps.length ? fit.coveredGaps : course.skillsCovered || [],
            alreadyKnown: (course.skillsCovered || []).filter((s) => !fit.coveredGaps.includes(s)),
            reasons: fit.reasons,
            fitBreakdown: fit.fitBreakdown,
          },
          fit,
        };
      })
      .sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1));

    const studentGaps = extractStudentGaps(plan, profile);

    return res.json({
      context: {
        goal: plan?.target?.role || profile.targetRole || null,
        priorityGaps: studentGaps.slice(0, 6),
        skills: (profile.skills || []).map((skill) => skill.name || skill).slice(0, 8),
      },
      courses: results,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/courses/:courseId
 */
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, active: true }).lean();
    if (!course) return res.status(404).json({ message: "Course not found." });

    const { profile, plan } = await context(req.auth.id);
    const reviews = await CourseReview.find({ courseId: course._id, hidden: false })
      .sort({ verifiedReviewer: -1, createdAt: -1 })
      .lean();

    const users = await User.find({ _id: { $in: reviews.map((r) => r.userId) } })
      .select("name avatarUrl")
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const fit = calculateCourseFit(course, profile, plan, reviews);

    return res.json({
      course,
      match: {
        score: fit.fitScore,
        fitLabel: fit.fitLabel,
        recommendation: fit.fitLabel,
        missingSkills: fit.coveredGaps.length ? fit.coveredGaps : course.skillsCovered || [],
        alreadyKnown: (course.skillsCovered || []).filter((s) => !fit.coveredGaps.includes(s)),
        reasons: fit.reasons,
        fitBreakdown: fit.fitBreakdown,
      },
      fit,
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        review: r.review,
        goalUsedFor: r.goalUsedFor,
        reviewerType: r.reviewerType,
        verifiedReviewer: r.verifiedReviewer,
        createdAt: r.createdAt,
        reviewer: {
          name: byId.get(String(r.userId))?.name || "Newbert student",
          avatar: byId.get(String(r.userId))?.avatarUrl || "",
        },
        outcome: r.verifiedReviewer ? r.outcomeAtTimeOfReview : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/courses/:courseId/review
 */
exports.upsertReview = async (req, res, next) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, active: true });
    if (!course) return res.status(404).json({ message: "Course not found." });

    const rating = Number(req.body.rating);
    const reviewText = String(req.body.review || "").trim();
    if (rating < 1 || rating > 5 || reviewText.length < 10) {
      return res.status(400).json({ message: "Add a 1–5 rating and a review of at least 10 characters." });
    }

    const alumni = await Alumni.findOne({ userId: req.auth.id, verified: true }).lean();
    await CourseReview.findOneAndUpdate(
      { courseId: course._id, userId: req.auth.id },
      {
        $set: {
          rating,
          review: reviewText,
          goalUsedFor: String(req.body.goalUsedFor || "").trim(),
          usefulness: req.body.usefulness || null,
          reviewerType: alumni ? "senior" : "student",
          verifiedReviewer: Boolean(alumni),
          outcomeAtTimeOfReview: alumni
            ? {
                placementStatus: alumni.outcomeType,
                company: alumni.placement?.company || alumni.company || null,
                gateStatus: alumni.outcomeType === "gate",
                rank: alumni.gateAIR || null,
              }
            : null,
          hidden: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    const reviews = await CourseReview.find({ courseId: course._id, hidden: false }).lean();
    const verified = reviews.filter((item) => item.verifiedReviewer);
    course.reviewStats = {
      averageRating: reviews.length
        ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1))
        : null,
      reviewCount: reviews.length,
      verifiedSeniorReviewCount: verified.length,
    };
    await course.save();

    return res.status(201).json({ reviewStats: course.reviewStats });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/courses/:courseId/add-to-plan
 */
exports.addToPlan = async (req, res, next) => {
  try {
    const [course, plan] = await Promise.all([
      Course.findById(req.params.courseId).lean(),
      Plan.findOne({ userId: req.auth.id }),
    ]);

    if (!course) return res.status(404).json({ message: "Course not found." });
    if (!plan) return res.status(400).json({ message: "Build your plan before adding a course." });

    const phase = plan.phases?.[0];
    if (!phase) return res.status(400).json({ message: "Your plan has no available phase." });

    const id = `course-${course._id}`;
    if (!plan.tasks.some((task) => task.id === id)) {
      plan.tasks.push({
        id,
        title: `Complete ${course.title}`,
        description: course.url,
        type: "weekly",
        phaseId: phase.id,
        scheduledWeek: 1,
        verifiable: false,
      });
      await plan.save();
    }
    return res.json({ message: "Course added to your plan." });
  } catch (error) {
    return next(error);
  }
};

/**
 * Admin course methods
 */
exports.createAdminCourse = async (req, res, next) => {
  try {
    const input = req.body || {};
    if (!String(input.title || "").trim() || !String(input.provider || "").trim() || !validUrl(input.url) || !String(input.category || "").trim()) {
      return res.status(400).json({ message: "Title, provider, category, and a valid official URL are required." });
    }
    if (input.thumbnailUrl && !validUrl(input.thumbnailUrl)) {
      return res.status(400).json({ message: "Use a valid HTTP(S) thumbnail image URL." });
    }

    const duplicate = await Course.findOne({ url: input.url }).lean();
    if (duplicate) return res.status(409).json({ message: "This course URL already exists." });

    const course = await Course.create({
      title: input.title,
      provider: input.provider,
      creator: input.creator,
      platform: input.platform,
      url: input.url,
      thumbnailUrl: String(input.thumbnailUrl || "").trim(),
      category: input.category,
      subcategory: input.subcategory,
      goals: list(input.goals),
      targetRoles: list(input.targetRoles),
      description: input.description,
      level: input.level || "all-levels",
      priceType: input.priceType || "free",
      price: input.price || null,
      skillsCovered: list(input.skillsCovered),
      topicsCovered: list(input.topicsCovered),
      prerequisites: list(input.prerequisites),
      syllabus: list(input.syllabus),
      estimatedHours: input.estimatedHours || null,
      language: input.language || "English",
      format: input.format || "video_practice",
      source: { type: "admin-reviewed", officialUrl: input.url, addedBy: String(req.auth.id) },
      aiAnalysis: input.aiAnalysis || null,
      active: true,
    });

    return res.status(201).json({ course });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: `Invalid course data: ${error.message}` });
    }
    return next(error);
  }
};

exports.listAdminCourses = async (req, res, next) => {
  try {
    return res.json({ courses: await Course.find({}).sort({ createdAt: -1 }).lean() });
  } catch (error) {
    return next(error);
  }
};

exports.analyzeAdminCourse = async (req, res, next) => {
  try {
    const rawText = String(req.body.rawText || "").trim();
    if (rawText.length < 20) {
      return res.status(400).json({ message: "Paste a course link and enough source description to analyze." });
    }
    return res.json(await analyzeCourse(rawText));
  } catch (error) {
    return next(error);
  }
};
