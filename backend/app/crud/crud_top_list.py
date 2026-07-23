from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.media import TopListItem
from app.schemas.media import TopListItemCreate, TopListItemUpdate

class CRUDTopList(CRUDBase[TopListItem, TopListItemCreate, TopListItemUpdate]):
    def get_user_top_list(self, db: Session, user_id: int) -> List[TopListItem]:
        return db.query(TopListItem).filter(TopListItem.user_id == id).order_by(TopListItem.position).all()

crud_top_list = CRUDTopList(TopListItem)