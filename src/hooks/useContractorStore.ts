import { useEffect, useMemo, useState } from "react";
import { fetchPublicContractors } from "../lib/repository";
import type { ContractorRecord } from "../types";

export const useContractorStore = () => {
  const [contractors, setContractors] = useState<ContractorRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const records = await fetchPublicContractors();
      setContractors(records);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load contractors.");
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const contractorMap = useMemo(() => {
    return new Map(contractors.map((contractor) => [contractor.id, contractor]));
  }, [contractors]);

  return {
    contractors,
    contractorMap,
    isReady,
    error,
    refresh,
  };
};
