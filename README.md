# Twitter Dashboard backend

Built using Express, Mongodb.

This app use Passport-twitter for Twitter authentication and allowing the app to interact on tweets on your behalf.

## Environment Variables

```Python
DB_USER="your mongo db user"
DB_PASSWORD="your mongo db password"
DB_NAME="your mongo db name"
FRONTEND_URL=http://localhost:3000 #URL of frontend app
TWITTER_API_V1=https://api.twitter.com/1.1 #twitter API v1 url
CONSUMER_KEY="your twitter consumer key"
CONSUMER_SECRET="your twitter secret key"
PORT=5000 #port for developent
```