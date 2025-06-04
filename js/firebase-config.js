// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDuZrBWjaq3XjlEFNy9r6PR4_zQOLZspCY",
    authDomain: "com4101-senior-project.firebaseapp.com",
    databaseURL: "https://com4101-senior-project-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "com4101-senior-project",
    storageBucket: "com4101-senior-project.appspot.com",
    messagingSenderId: "116370328269",
    appId: "1:116370328269:web:0cf3fba5d982e684d4f784"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();