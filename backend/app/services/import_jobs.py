import threading
import time
import uuid
from typing import Callable, List, Optional


class ImportJob:
    def __init__(self, source: str, total: int, baseline_seconds_per_item: float):
        self.id = uuid.uuid4().hex[:8]
        self.source = source
        self.status = "running"  # running | done | error
        self.total = total
        self.baseline_seconds_per_item = baseline_seconds_per_item
        self.current = 0
        self.created = 0
        self.skipped = 0
        self.updated = 0
        self.enriched = 0
        self.imported_items: list = []
        self.skipped_items: list = []
        self.error: Optional[str] = None
        self.result: Optional[dict] = None
        self.started_at = time.time()
        self._lock = threading.Lock()

    def progress(
        self,
        current: int = None,
        created: int = None,
        skipped: int = None,
        updated: int = None,
        enriched: int = None,
    ):
        with self._lock:
            if current is not None:
                self.current = current
            if created is not None:
                self.created = created
            if skipped is not None:
                self.skipped = skipped
            if updated is not None:
                self.updated = updated
            if enriched is not None:
                self.enriched = enriched

    def add_imported(self, item: dict):
        with self._lock:
            self.imported_items.append(item)

    def add_skipped(self, item: dict):
        with self._lock:
            self.skipped_items.append(item)

    def eta_seconds(self) -> Optional[float]:
        elapsed = time.time() - self.started_at
        if self.total <= 0:
            return None
        remaining = self.total - self.current
        if remaining <= 0:
            return 0.0
        if self.current < 3:
            return self.baseline_seconds_per_item * remaining
        avg = max(elapsed / self.current, 0.05)
        return avg * remaining

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "id": self.id,
                "source": self.source,
                "status": self.status,
                "total": self.total,
                "current": self.current,
                "created": self.created,
                "skipped": self.skipped,
                "updated": self.updated,
                "enriched": self.enriched,
                "imported_items": list(self.imported_items),
                "skipped_items": list(self.skipped_items),
                "error": self.error,
                "result": self.result,
                "eta_seconds": self.eta_seconds(),
            }


JOBS: dict = {}
JOBS_LOCK = threading.Lock()


def start_job(source: str, total: int, baseline_seconds_per_item: float, fn: Callable) -> str:
    job = ImportJob(source, total, baseline_seconds_per_item)
    with JOBS_LOCK:
        JOBS[job.id] = job

    def runner():
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            result = fn(job, db)
            job.result = result
            job.current = job.total
            job.status = "done"
        except Exception as e:
            job.status = "error"
            job.error = str(e)
        finally:
            db.close()

    threading.Thread(target=runner, daemon=True).start()
    return job.id


def get_job(job_id: str) -> Optional[ImportJob]:
    with JOBS_LOCK:
        return JOBS.get(job_id)


def clean_old_jobs(max_age_seconds: int = 3600):
    cutoff = time.time() - max_age_seconds
    with JOBS_LOCK:
        stale = [jid for jid, job in JOBS.items() if job.started_at < cutoff]
        for jid in stale:
            del JOBS[jid]
