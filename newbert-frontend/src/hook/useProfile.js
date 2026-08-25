import useAuth from "./useAuth";

export default function useProfile() {
  const { profile, loading, error, refreshProfile, saveProfile } = useAuth();
  return { profile, loading, error, refreshProfile, saveProfile };
}
