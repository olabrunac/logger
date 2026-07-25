from sqlalchemy.orm import Session, joinedload
from app.models.media import CustomList, CustomListItem
from app.schemas.media import CustomListCreate, CustomListUpdate, CustomListItemCreate


def get_user_lists(db: Session, *, user_id: int):
    return db.query(CustomList).options(
        joinedload(CustomList.items).joinedload(CustomListItem.media_item)
    ).filter(CustomList.user_id == user_id).order_by(CustomList.created_at.desc()).all()


def get_list(db: Session, *, list_id: int, user_id: int):
    return db.query(CustomList).options(
        joinedload(CustomList.items).joinedload(CustomListItem.media_item)
    ).filter(CustomList.id == list_id, CustomList.user_id == user_id).first()


def create_list(db: Session, *, user_id: int, obj_in: CustomListCreate):
    db_obj = CustomList(user_id=user_id, **obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_list(db: Session, *, list_id: int, user_id: int, obj_in: CustomListUpdate):
    db_obj = db.query(CustomList).filter(
        CustomList.id == list_id, CustomList.user_id == user_id
    ).first()
    if not db_obj:
        return None
    for field, value in obj_in.dict(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_list(db: Session, *, list_id: int, user_id: int):
    db_obj = db.query(CustomList).filter(
        CustomList.id == list_id, CustomList.user_id == user_id
    ).first()
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True


def add_item(db: Session, *, list_id: int, user_id: int, obj_in):
    from app.models.media import CustomList as CustomListModel
    custom_list = db.query(CustomListModel).filter(
        CustomListModel.id == list_id, CustomListModel.user_id == user_id
    ).first()
    if not custom_list:
        return None

    # Resolve media_item_id: create if needed
    media_item_id = obj_in.media_item_id
    if not media_item_id and obj_in.media_item:
        from app.crud.crud_media import CRUDMediaItem
        media_item_crud = CRUDMediaItem.__new__(CRUDMediaItem)
        from app.models.media import MediaItem
        media_item_crud.__init__(MediaItem)
        media_item = media_item_crud.get_or_create(db, obj_in=obj_in.media_item)
        media_item_id = media_item.id

    if not media_item_id:
        return None

    existing = db.query(CustomListItem).filter(
        CustomListItem.custom_list_id == list_id,
        CustomListItem.media_item_id == media_item_id,
    ).first()
    if existing:
        return existing

    max_pos = db.query(CustomListItem.position).filter(
        CustomListItem.custom_list_id == list_id
    ).order_by(CustomListItem.position.desc()).first()
    next_pos = (max_pos[0] + 1) if max_pos else 0

    db_obj = CustomListItem(
        custom_list_id=list_id,
        media_item_id=media_item_id,
        position=next_pos,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def remove_item(db: Session, *, list_id: int, item_id: int, user_id: int):
    custom_list = db.query(CustomList).filter(
        CustomList.id == list_id, CustomList.user_id == user_id
    ).first()
    if not custom_list:
        return False
    db_obj = db.query(CustomListItem).filter(
        CustomListItem.id == item_id,
        CustomListItem.custom_list_id == list_id,
    ).first()
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True


def reorder_items(db: Session, *, list_id: int, user_id: int, item_ids: list[int]):
    custom_list = db.query(CustomList).filter(
        CustomList.id == list_id, CustomList.user_id == user_id
    ).first()
    if not custom_list:
        return False
    for idx, item_id in enumerate(item_ids):
        item = db.query(CustomListItem).filter(
            CustomListItem.id == item_id,
            CustomListItem.custom_list_id == list_id,
        ).first()
        if item:
            item.position = idx
    db.commit()
    return True
