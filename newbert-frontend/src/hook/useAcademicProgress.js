import useAuth from './useAuth';
import useStudyProgress from './useStudyProgress';
import { mergeStudySummaries, readStudyLocal } from '../utils/studyTools';
export default function useAcademicProgress() {
  const { profile, isAuthenticated } = useAuth();
  const progress = useStudyProgress();
  const scope = isAuthenticated ? profile?.userId : 'guest';
  const local = readStudyLocal(`newbert-lecture-index:${scope}`, []);
  return { ...progress, scope, records: mergeStudySummaries(progress.records, Array.isArray(local) ? local : []) };
}
