import API from './api';

// Profile link management
export const connectProfile = (platform, profileUrl) => API.post('/career-dna/profiles/connect', { platform, profileUrl });
export const disconnectProfile = (platform) => API.delete(`/career-dna/profiles/${encodeURIComponent(platform)}`);
export const syncProfile = (platform) => API.post(`/career-dna/profiles/${encodeURIComponent(platform)}/sync`);
export const getProfiles = () => API.get('/career-dna/profiles');

// Career DNA
export const getCareerDNA = () => API.get('/career-dna/career-dna');
export const getAlumniCareerDNA = (alumniId) => API.get(`/career-dna/${alumniId}/career-dna`);
export const getAlumniEvidence = (alumniId) => API.get(`/career-dna/${alumniId}/evidence`);
export const compareWithAlumni = (alumniId) => API.get(`/career-dna/${alumniId}/compare`);
export const getGithubEvidence = () => API.get('/career-dna/github-evidence');
