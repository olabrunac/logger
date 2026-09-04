from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.media import TopListItem
from app.schemas.media import TopListItemCreate, TopListItemUpdate

class CRUDTopList(CRUDBase[TopListItem, TopListItemCreate, TopListItemUpdate]):
    def get_user_top_list(self, db: Session, user_id: int) -> List[TopListItem]:
        # joinedload do media_item evita N+1 (antes: 1 query de lista + N queries de media por item)
        return (
            db.query(TopListItem)
            .options(joinedload(TopListItem.media_item))
            .filter(TopListItem.user_id == user_id)
            .order_by(TopListItem.position)
            .all()
        )

crud_top_list = CRUDTopList(TopListItem)