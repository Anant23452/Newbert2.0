const NoteResource = require("../Models/NoteResource");
exports.list = async (req, res, next) => {
  try { res.json({ resources: await NoteResource.find({ published: true }).select("-__v").lean() }); }
  catch (error) { next(error); }
};
exports.listAdmin = async (req, res, next) => {
  try { res.json({ resources: await NoteResource.find().select("-__v").lean() }); }
  catch (error) { next(error); }
};
exports.save = async (req, res, next) => {
  try {
    const { key } = req.body;
    if (typeof key !== "string" || !/^(electrical|civil|information-technology):sem[1-8]:[a-z0-9-]{1,60}:[1-5]$/.test(key)) return res.status(400).json({ message: "Select a valid study unit." });
    const fields = {};
    for (const field of ["lectureUrl", "notesUrl", "questionsUrl", "syllabusUrl"]) {
      const value = String(req.body[field] || "").trim();
      if (value) {
        let url;
        try { url = new URL(value); } catch { return res.status(400).json({ message: `${field} must be a valid HTTPS link.` }); }
        if (url.protocol !== "https:" || url.username || url.password || value.length > 2000) return res.status(400).json({ message: `${field} must be a public HTTPS link.` });
        if (field === "lectureUrl" && !["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(url.hostname)) return res.status(400).json({ message: "Use a YouTube lecture link." });
      }
      fields[field] = value;
    }
    if (typeof req.body.published !== "boolean") return res.status(400).json({ message: "Choose a publication status." });
    if (req.body.published && !fields.lectureUrl && !fields.notesUrl && !fields.questionsUrl) return res.status(400).json({ message: "Add at least one resource before publishing." });
    fields.published = req.body.published;
    fields.summary = String(req.body.summary || "").trim().slice(0, 2000);
    fields.syllabusVersion = String(req.body.syllabusVersion || "").trim().slice(0, 100);
    const resource = await NoteResource.findOneAndUpdate({ key }, { $set: fields }, { upsert: true, new: true, runValidators: true });
    res.json({ resource });
  } catch (error) { next(error); }
};
