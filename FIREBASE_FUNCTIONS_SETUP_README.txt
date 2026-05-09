AquoraX real job notifications need a Firebase Cloud Function.

Upload the web files to GitHub as normal.
Then deploy the backend sender from this zip:

1. Install Firebase CLI if needed:
   npm install -g firebase-tools

2. Login:
   firebase login

3. From this extracted folder:
   firebase use aquoraxapp
   firebase deploy --only functions

Important:
- Scheduled Cloud Functions normally require Firebase Blaze billing to be enabled.
- Users do not paste keys.
- Users sign in, install AquoraX, tap Enable Notifications, then jobs sync to Firestore.
- The function checks due reminders every 5 minutes and sends FCM push notifications.
