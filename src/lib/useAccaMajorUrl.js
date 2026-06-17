import { useEffect, useState } from 'react';
import {
  buildAccaProgramsUrl,
  loadProgramCatalog,
  resolveMajorPrograms,
} from '../services/programCatalogService';

/**
 * Builds the accaco.com programs URL for a recommended major. Returns a working
 * search-based URL immediately, then upgrades to the precise program-filter URL
 * (exact related program names from accaco's live catalog) once it loads.
 */
export function useAccaMajorUrl(majorId, majorName) {
  const fallback = buildAccaProgramsUrl({ program: majorName || '' });
  const [url, setUrl] = useState(fallback);

  useEffect(() => {
    let active = true;
    loadProgramCatalog()
      .then((programs) => {
        if (!active) return;
        const names = resolveMajorPrograms(programs, { majorId, majorName });
        setUrl(names.length
          ? buildAccaProgramsUrl({ programs: names })
          : buildAccaProgramsUrl({ program: majorName || '' }));
      })
      .catch(() => { /* keep the search fallback */ });
    return () => { active = false; };
  }, [majorId, majorName]);

  return url;
}
