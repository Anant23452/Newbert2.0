import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FolderGit2,
  Github,
  Globe,
  Layers,
  MoreVertical,
  Pin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import GithubProjectModal from "./GithubProjectModal";
import {
  deleteProject,
  refreshProjectAnalysis,
  toggleFeaturedProject,
  updateProjectVisibility,
} from "../Services/projectService";

const reveal = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: "easeOut" } },
};

export default function FeaturedProjects({ profile, onEdit, onProfileUpdated }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [allProjectsOpen, setAllProjectsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const allProjects = profile.projectDetails || [];
  const featuredProjects = allProjects.filter((p) => p.isFeatured).slice(0, 3);
  const displayProjects = featuredProjects.length ? featuredProjects : allProjects.slice(0, 3);
  const hasGithub = Boolean(profile.githubUsername || profile.github);

  const handleToggleFeatured = async (projectId) => {
    setBusyId(projectId);
    setMessage("");
    try {
      const result = await toggleFeaturedProject(projectId);
      if (onProfileUpdated) onProfileUpdated(result.projects);
      setMessage(result.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not update featured status.");
    } finally {
      setBusyId("");
    }
  };

  const handleRefreshProject = async (projectId) => {
    setBusyId(projectId);
    setMessage("");
    try {
      const result = await refreshProjectAnalysis(projectId);
      if (onProfileUpdated) onProfileUpdated(result.projects);
      setMessage("Project analysis refreshed with latest GitHub evidence.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not refresh repository analysis.");
    } finally {
      setBusyId("");
    }
  };

  const handleVisibility = async (projectId, visibility) => {
    setBusyId(projectId);
    setMessage("");
    try {
      const result = await updateProjectVisibility(projectId, visibility);
      if (onProfileUpdated) onProfileUpdated(result.projects);
      setMessage(result.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not update project visibility.");
    } finally {
      setBusyId("");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Remove this project from your profile evidence?")) return;
    setBusyId(projectId);
    try {
      const result = await deleteProject(projectId);
      if (onProfileUpdated) onProfileUpdated(result.projects);
      if (selectedProject?.id === projectId) setSelectedProject(null);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not delete project.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <Motion.section
      id="featured-projects"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={reveal}
      className="scroll-mt-32 mt-6 rounded-2xl border border-white/10 bg-[#111c2e] p-5 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 size={18} className="text-orange-400" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Portfolio Evidence</p>
          </div>
          <h2 className="mt-1 text-xl font-black text-white">Featured Projects</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Verified tech stack and code evidence inspected from your repositories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allProjects.length > 3 && (
            <button
              type="button"
              onClick={() => setAllProjectsOpen(true)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10"
            >
              View all ({allProjects.length})
            </button>
          )}
          {hasGithub ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:bg-orange-400"
            >
              <Plus size={14} /> Add GitHub Project
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-orange-400/40 bg-orange-400/10 px-3.5 py-2 text-xs font-black text-orange-300 transition hover:bg-orange-400/20"
            >
              <Github size={14} /> Connect GitHub
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="mt-3 text-xs font-bold text-orange-300">{message}</p>
      )}

      {/* Featured Projects Cards (Max 3) */}
      {displayProjects.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {displayProjects.map((project) => (
            <ProjectCard
              key={project.id || project.name}
              project={project}
              onDetails={() => setSelectedProject(project)}
              onToggleFeatured={() => handleToggleFeatured(project.id)}
              onRefresh={() => handleRefreshProject(project.id)}
              onVisibility={(visibility) => handleVisibility(project.id, visibility)}
              busy={busyId === project.id}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-5 rounded-xl border border-white/5 bg-[#0d1727] p-8 text-center">
          {!hasGithub ? (
            <div className="mx-auto max-w-md">
              <Github size={32} className="mx-auto text-orange-400" />
              <h3 className="mt-3 font-black text-white">Show what you have actually built</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Connect GitHub and Newbert will inspect the technologies used in your repositories to verify your evidence and refine your roadmap.
              </p>
              <button
                type="button"
                onClick={onEdit}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-orange-400"
              >
                <Github size={15} /> Connect GitHub Account
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-md">
              <FolderGit2 size={32} className="mx-auto text-orange-400" />
              <h3 className="mt-3 font-black text-white">No projects featured yet</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Choose up to 3 projects from your connected GitHub account ({profile.githubUsername}) that best represent your development skills.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-orange-400"
              >
                <Plus size={15} /> Choose & Analyze Repositories
              </button>
            </div>
          )}
        </div>
      )}

      {/* GitHub Repository Picker Modal */}
      <GithubProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        connectedUsername={profile.githubUsername}
        onProjectAdded={(newProj, all) => {
          if (onProfileUpdated) onProfileUpdated(all);
        }}
      />

      {/* View All Projects Modal */}
      <AllProjectsModal
        isOpen={allProjectsOpen}
        onClose={() => setAllProjectsOpen(false)}
        projects={allProjects}
        onToggleFeatured={handleToggleFeatured}
        onDelete={handleDeleteProject}
        onVisibility={handleVisibility}
        onAddNew={() => {
          setAllProjectsOpen(false);
          setModalOpen(true);
        }}
        busyId={busyId}
      />

      {/* Project Details Drawer */}
      <ProjectDetailsDrawer
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </Motion.section>
  );
}

function ProjectCard({ project, onDetails, onToggleFeatured, onRefresh, onVisibility, busy }) {
  const techs = project.confirmedTechnologies?.length ? project.confirmedTechnologies : project.technologies || [];
  const isStrong = project.evidenceLevel === "strong";
  const badgeTone = isStrong
    ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/30"
    : project.source === "github"
    ? "bg-orange-400/10 text-orange-300 border-orange-400/30"
    : "bg-white/5 text-slate-300 border-white/10";

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-white/5 bg-[#0d1727] p-4 transition hover:border-orange-400/30 hover:bg-white/[.03]">
      <div>
        {/* Card Header & Evidence Badge */}
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeTone}`}>
            {project.evidenceLabel || (isStrong ? "Strong project evidence" : "Used in project")}
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className={`flex items-center gap-1 text-[10px] font-bold ${project.isFeatured ? "text-orange-400" : "text-slate-500"}`}>
              <Pin size={11} className={project.isFeatured ? "fill-orange-400" : ""} /> {project.isFeatured ? "Featured" : "Not featured"}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              {project.visibility === "private" ? <EyeOff size={11} /> : <Eye size={11} />}
              {project.visibility === "private" ? "Private" : "Public"}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="mt-3 text-base font-black text-white group-hover:text-orange-300">{project.title || project.name}</h3>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{project.description}</p>
        )}

        {/* Tech Stack Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {techs.slice(0, 5).map((tech) => (
            <span key={tech} className="rounded-md bg-white/[.06] px-2 py-1 text-[11px] font-bold text-slate-200">
              {tech}
            </span>
          ))}
          {techs.length > 5 && (
            <span className="rounded-md bg-white/[.04] px-1.5 py-1 text-[10px] font-bold text-slate-400">
              +{techs.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              title="Open GitHub Repository"
              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Github size={13} />
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              title="Open Live Deployment"
              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Globe size={13} />
            </a>
          )}
          <button
            type="button"
            onClick={onDetails}
            className="text-xs font-extrabold text-orange-300 transition hover:underline"
          >
            Details →
          </button>
        </div>

        <div className="flex items-center gap-1">
          {project.source === "github" && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              title="Refresh repository analysis"
              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFeatured}
            disabled={busy}
            title={project.isFeatured ? "Unpin from featured" : "Pin to featured"}
            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Pin size={12} className={project.isFeatured ? "fill-orange-400 text-orange-400" : ""} />
          </button>
          <button
            type="button"
            onClick={() => onVisibility(project.visibility === "private" ? "public" : "private")}
            disabled={busy}
            title={project.visibility === "private" ? "Make project public" : "Make project private"}
            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            {project.visibility === "private" ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function AllProjectsModal({ isOpen, onClose, projects, onToggleFeatured, onDelete, onVisibility, onAddNew, busyId }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111c2e] p-6 text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">All Portfolio Projects</p>
              <h2 className="text-xl font-black">Manage Projects ({projects.length})</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                You can feature up to 3 projects on your main profile.
              </p>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
            {projects.map((p) => (
              <div key={p.id || p.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0d1727] p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white">{p.title || p.name}</h4>
                    {p.isFeatured && (
                      <span className="rounded bg-orange-400/20 px-1.5 py-0.5 text-[10px] font-black text-orange-300">Featured</span>
                    )}
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{p.evidenceLevel || "moderate"}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">{p.visibility === "private" ? "Private" : "Public"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(p.confirmedTechnologies || p.technologies || []).map((tech) => (
                      <span key={tech} className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">{tech}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onVisibility(p.id, p.visibility === "private" ? "public" : "private")}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    {p.visibility === "private" ? <EyeOff size={12} /> : <Eye size={12} />}
                    {p.visibility === "private" ? "Make public" : "Make private"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFeatured(p.id)}
                    disabled={busyId === p.id}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      p.isFeatured
                        ? "border-orange-400/40 bg-orange-400/10 text-orange-300 hover:bg-orange-400/20"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Pin size={12} className={p.isFeatured ? "fill-orange-400" : ""} />
                    {p.isFeatured ? "Unpin" : "Pin to Featured"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    disabled={busyId === p.id}
                    title="Delete project"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-400/10 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onAddNew}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-black text-slate-950"
            >
              <Plus size={14} /> Add Another Project
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </Motion.div>
      </div>
    </AnimatePresence>
  );
}

function ProjectDetailsDrawer({ project, onClose }) {
  if (!project) return null;
  const detected = project.detectedTechnologies || [];

  return (
    <AnimatePresence>
      <Motion.div
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
      >
        <Motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={`Project details for ${project.title || project.name}`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          onMouseDown={(e) => e.stopPropagation()}
          className="ml-auto h-full w-full max-w-md overflow-y-auto bg-[#111c2e] p-6 text-white"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase text-orange-400">Project Intelligence</p>
              <h2 className="mt-1 text-2xl font-black">{project.title || project.name}</h2>
              <span className="mt-1 inline-block rounded bg-orange-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-orange-300">
                {project.evidenceLabel || "Used in project"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-5 space-y-5 text-sm leading-6">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Description</h3>
              <p className="mt-1 text-xs text-slate-300">{project.description || "No description recorded."}</p>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Verified Evidence Signals</h3>
              <div className="mt-2 space-y-2">
                {detected.length ? (
                  detected.map((item) => {
                    const isVerified = item.level === "VERIFIED_PROJECT_USAGE";
                    const isConfirmed = item.level === "STUDENT_CONFIRMED";
                    return (
                      <div key={item.name} className="rounded-lg border border-white/5 bg-[#0d1727] p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white">{item.name}</span>
                          <span className={`text-[10px] font-extrabold ${isVerified ? "text-emerald-300" : isConfirmed ? "text-cyan-300" : "text-orange-300"}`}>
                            {isVerified ? "✓ Verified code usage" : isConfirmed ? "? Student confirmed" : "? Detected in config"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-slate-400">{item.reason}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">Manual project submission.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Repository & Deployment</h3>
              <div className="mt-2 flex flex-col gap-2">
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d1727] p-3 text-xs font-bold text-orange-300 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2"><Github size={14} /> Repository Link</span>
                    <ExternalLink size={13} />
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d1727] p-3 text-xs font-bold text-emerald-300 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2"><Globe size={14} /> Live Deployment</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            {project.lastAnalyzedAt && (
              <p className="text-[11px] text-slate-500">
                Last analyzed: {new Date(project.lastAnalyzedAt).toLocaleString()}
              </p>
            )}
          </div>
        </Motion.aside>
      </Motion.div>
    </AnimatePresence>
  );
}
