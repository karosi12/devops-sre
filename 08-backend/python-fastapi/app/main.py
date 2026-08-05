from fastapi import FastAPI, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.database import engine, get_db, Base
from app.models import User, Post
from app.schemas import UserCreate, UserResponse, PostCreate, PostResponse
from app.metrics import users_created_total, posts_created_total, request_duration_seconds
from app.logging_config import configure_logging, get_logger
from app.tracing import setup_tracing

configure_logging()
logger = get_logger("wiki_service")

app = FastAPI(title="User and Post API")
setup_tracing(app)


# Create database tables on startup
@app.on_event("startup")
async def startup():
    logger.info("wiki_service_startup", message="Creating database tables", service="wiki_service")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("wiki_service_ready", message="Database tables created successfully", service="wiki_service")


@app.post("/users", response_model=UserResponse)
@request_duration_seconds.time()
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new user.

    Request body:
    - name: Name of the user

    Response:
    - id: ID of the created user
    - name: Name of the user
    - created_time: Time the user was created
    """
    new_user = User(name=user.name)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Increment Prometheus counter
    users_created_total.inc()
    logger.info("user_created", service="wiki_service", user_id=new_user.id, user_name=new_user.name)

    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        created_time=new_user.created_time
    )


@app.post("/posts", response_model=PostResponse)
@request_duration_seconds.time()
async def create_post(post: PostCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new post under a given user.

    Request body:
    - user_id: ID of the user creating the post
    - content: Content of the post

    Response:
    - post_id: ID of the created post
    - content: Content of the post
    - user_id: ID of the user who created the post
    - created_time: Time the post was created
    """
    # Check if user exists
    result = await db.execute(select(User).where(User.id == post.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_post = Post(content=post.content, user_id=post.user_id)
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)

    # Increment Prometheus counter
    posts_created_total.inc()
    logger.info("post_created", service="wiki_service", post_id=new_post.id, user_id=new_post.user_id)

    return PostResponse(
        post_id=new_post.id,
        content=new_post.content,
        user_id=new_post.user_id,
        created_time=new_post.created_time
    )


@app.get("/user/{id}", response_model=UserResponse)
@request_duration_seconds.time()
async def get_user(id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetch a user by ID.

    Response:
    - id: ID of the user
    - name: Name of the user
    - created_time: Time the user was created
    """
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        name=user.name,
        created_time=user.created_time
    )


@app.get("/posts/{id}", response_model=PostResponse)
@request_duration_seconds.time()
async def get_post(id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetch a post by ID.

    Response:
    - post_id: ID of the post
    - content: Content of the post
    - user_id: ID of the user who created the post
    - created_time: Time the post was created
    """
    result = await db.execute(select(Post).where(Post.id == id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return PostResponse(
        post_id=post.id,
        content=post.content,
        user_id=post.user_id,
        created_time=post.created_time
    )


@app.get("/")
@request_duration_seconds.time()
async def root():
    """Root endpoint with API information."""
    return {
        "message": "User and Post API",
        "endpoints": {
            "POST /users": "Create a new user",
            "POST /posts": "Create a new post",
            "GET /user/{id}": "Get user by ID",
            "GET /posts/{id}": "Get post by ID",
            "GET /metrics": "Prometheus metrics"
        }
    }


@app.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.

    Exposes Prometheus metrics including:
    - users_created_total: Total number of users created
    - posts_created_total: Total number of posts created
    """
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
