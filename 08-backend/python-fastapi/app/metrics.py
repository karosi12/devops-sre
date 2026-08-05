from prometheus_client import Counter, Histogram
import time

# Counter for total number of users created
users_created_total = Counter(
    'users_created_total',
    'Total number of users created'
)

# Counter for total number of posts created
posts_created_total = Counter(
    'posts_created_total',
    'Total number of posts created'
)

# Histogram for request duration
request_duration_seconds = Histogram(
    'request_duration_seconds',
    'Request duration in seconds'
)
