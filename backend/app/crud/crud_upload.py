from sqlalchemy.orm import Session
from app.models.upload import UploadedFile


def save_file(db: Session, filename: str, content_type: str, data: bytes, is_gif: bool = False) -> UploadedFile:
    existing = db.query(UploadedFile).filter(UploadedFile.filename == filename).first()
    if existing:
        existing.content_type = content_type
        existing.data = data
        existing.is_gif = is_gif
        db.commit()
        db.refresh(existing)
        return existing
    record = UploadedFile(filename=filename, content_type=content_type, data=data, is_gif=is_gif)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_file(db: Session, filename: str):
    return db.query(UploadedFile).filter(UploadedFile.filename == filename).first()


def delete_file(db: Session, filename: str) -> bool:
    record = db.query(UploadedFile).filter(UploadedFile.filename == filename).first()
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True
