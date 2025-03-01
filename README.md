# AcabotJS
A Discord bot for all your all your A Capella group's needs, rewritten with discord.js

This Discord bot was created initially created using Python with the [pycord](https://pycord.dev/) library, but has been rewritten with JavaScript using [discord.js](https://discord.js.org/). The bot was created for Fredonia's A Capella community Discord servers, but is posted here for public use. You can repurpose this for your own needs if you wish, or utilize it as is by [adding the bot to your Discord server](https://discord.com/oauth2/authorize?client_id=1341911595441455104).

# Features
## Google Calendar Integration
This bot has commands that can be used to interact with Google Calendar and to create webhooks that will send updates from a calendar to a channel in your server. Webhooks are achieved using Google Cloud Run Functions to listen for HTTP requests from the Google Calendar API. You can also create events and get specific events off the calendar to share with your server members.

## Localist API
This bot utilizes the Localist API to get calendar events from SUNY Fredonia's calendar and display them to users. This makes it easy for users to look up what events are happening on campus on a given day to help them plan out shows and rehearsals accordingly.

### More features coming soon.
This bot is still in the process of being migrated from the old bot, so some functions may be missing. 

**Notice:** AcabotJS utilizes Google API's for some of it's functions. Some functions may require the user to sign in with their Google Account. After signing in, the user's Google Account will be linked with the bot, and some information from that user's Google Account may be used by the bot. To learn more information, please read the [privacy policy](https://www.privacypolicies.com/live/f493ede2-c4ed-41ff-94f0-e4e59381305e)
