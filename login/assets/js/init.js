// Firebase Authentication for AIsean Football Predictions
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdqEXkgSy8GH1Xh1lXes6RFcuch6KtBsk",
  authDomain: "aisean.firebaseapp.com",
  databaseURL: "https://aisean-default-rtdb.firebaseio.com",
  projectId: "aisean",
  1111
  storageBucket: "aisean.firebasestorage.app",
  messagingSenderId: "230112341467",
  appId: "1:230112341467:web:b1398b98e17b44dde48bfe",
  measurementId: "G-L5SKYRDF4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const alertContainer = document.getElementById('alertContainer');
const resetAlertContainer = document.getElementById('resetAlertContainer');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const passwordStrength = document.getElementById('passwordStrength');
const passwordFeedback = document.getElementById('passwordFeedback');
const togglePasswordButtons = document.querySelectorAll('.toggle-password');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const resetButton = document.getElementById('resetButton');
const authTabs = document.getElementById('authTabs');

// Theme Detection and Management
function initTheme() {
  // Check for user preference in localStorage
  const savedTheme = localStorage.getItem('theme');
  
  // Check if system prefers dark mode
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set theme based on priority: saved preference first, then system preference
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(prefersDarkMode ? 'dark' : 'light');
  }
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    // Only update if user hasn't set a manual preference
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  // Store the current theme preference
  localStorage.setItem('theme', theme);
}

// Helper Functions
function showAlert(container, message, type = 'danger') {
  container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    const alert = container.querySelector('.alert');
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 5000);
}

function setLoading(button, isLoading) {
  const spinner = button.querySelector('.spinner-border');
  const buttonText = button.querySelector('.button-text');
  
  if (isLoading) {
    spinner.classList.remove('d-none');
    button.disabled = true;
    buttonText.textContent = 'Processing...';
  } else {
    spinner.classList.add('d-none');
    button.disabled = false;
    buttonText.textContent = button.id === 'loginButton' ? 'Login' :
      button.id === 'signupButton' ? 'Sign Up' : 'Send Reset Link';
  }
}

function validatePassword(password) {
  const strength = {
    score: 0,
    feedback: []
  };
  
  // Length check
  if (password.length < 6) {
    strength.feedback.push('Password should be at least 6 characters');
  } else {
    strength.score += 1;
  }
  
  // Contains number
  if (/\d/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add numbers');
  }
  
  // Contains lowercase
  if (/[a-z]/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add lowercase letters');
  }
  
  // Contains uppercase
  if (/[A-Z]/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add uppercase letters');
  }
  
  // Contains special char
  if (/[^A-Za-z0-9]/.test(password)) {
    strength.score += 1;
  } else {
    strength.feedback.push('Add special characters');
  }
  
  // Categorize strength
  let category, width;
  if (strength.score < 2) {
    category = 'weak';
    width = 20;
  } else if (strength.score < 4) {
    category = 'medium';
    width = 60;
  } else {
    category = 'strong';
    width = 100;
  }
  
  return {
    category,
    width,
    feedback: strength.feedback.join(', ')
  };
}

// Firestore Functions
async function saveUserToFirestore(uid, userData) {
  try {
    const usersCollection = collection(db, "users");
    const userDocRef = doc(usersCollection, uid);
    
    await setDoc(userDocRef, {
      ...userData,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      userType: "Member",
      status: "active"
    });
    
    return true;
  } catch (error) {
    throw error;
  }
}

async function updateLastLogin(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    
    await updateDoc(userDocRef, {
      lastLogin: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    throw error;
  }
}

// Flag to prevent auto-redirect during signup process
let isSigningUp = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme based on system preference
  initTheme();
  
  // Signup Form Submission
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('signupUsername').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const termsCheck = document.getElementById('termsCheck').checked;
      
      // Validation
      if (!termsCheck) {
        showAlert(alertContainer, 'Please agree to the Terms and Conditions');
        return;
      }
      
      if (password !== confirmPassword) {
        showAlert(alertContainer, 'Passwords do not match');
        return;
      }
      
      // Start loading
      setLoading(signupButton, true);
      
      // Set signup flag to prevent auto-redirect
      isSigningUp = true;
      
      try {
        // Firebase signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const userData = {
          username: username,
          email: email,
          userType: "Member",
          status: "active"
        };
        
        try {
          await saveUserToFirestore(userCredential.user.uid, userData);
          
          showAlert(alertContainer, 'Account created successfully! You can now login.', 'success');
          signupForm.reset();
          
          // Switch to login tab
          const loginTab = document.querySelector('#login-tab');
          const tab = new bootstrap.Tab(loginTab);
          tab.show();
          
        } catch (firestoreError) {
          showAlert(alertContainer, 'Account created but profile data could not be saved. Please contact support.');
        }
      } catch (error) {
        let errorMessage = 'Failed to create account';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Email is already in use. Please try a different email or login.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
        
        showAlert(alertContainer, errorMessage);
      } finally {
        setLoading(signupButton, false);
        // Reset signup flag after process completes
        setTimeout(() => { isSigningUp = false; }, 1000);
      }
    });
  }
  
  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      // Start loading
      setLoading(loginButton, true);
      
      try {
        // Firebase login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        try {
          await updateLastLogin(userCredential.user.uid);
          
          showAlert(alertContainer, 'Login successful! Redirecting...', 'success');
          
          // Redirect after successful login
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
          
        } catch (updateError) {
          // Still redirect user as the login was successful
          showAlert(alertContainer, 'Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } catch (error) {
        let errorMessage = 'Login failed';
        
        if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = 'Incorrect email or password';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
        }
        
        showAlert(alertContainer, errorMessage);
      } finally {
        setLoading(loginButton, false);
      }
    });
  }
  
  // Password Reset Form
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('resetEmail').value;
      
      // Start loading
      setLoading(resetButton, true);
      
      try {
        // Firebase password reset
        await sendPasswordResetEmail(auth, email);
        showAlert(resetAlertContainer, 'Password reset email sent! Check your inbox.', 'success');
        resetPasswordForm.reset();
      } catch (error) {
        let errorMessage = 'Failed to send reset email';
        
        if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email';
        }
        
        showAlert(resetAlertContainer, errorMessage);
      } finally {
        setLoading(resetButton, false);
      }
    });
  }
  
  // Password Strength Meter
  const signupPassword = document.getElementById('signupPassword');
  if (signupPassword) {
    signupPassword.addEventListener('input', function() {
      const result = validatePassword(this.value);
      
      // Update the progress bar
      passwordStrength.style.width = `${result.width}%`;
      passwordStrength.className = `progress-bar ${result.category}`;
      
      // Display feedback
      if (this.value.length > 0) {
        passwordFeedback.textContent = result.feedback || 'Strong password';
      } else {
        passwordFeedback.textContent = '';
      }
    });
  }
  
  // Toggle Password Visibility
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
      const inputField = this.previousElementSibling;
      const icon = this.querySelector('i');
      
      if (inputField.type === 'password') {
        inputField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        inputField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
  
  // Forgot Password Link
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
      forgotPasswordModal.show();
    });
  }
  
  // Check Auth State
  onAuthStateChanged(auth, (user) => {
    if (user && !isSigningUp) {
      // If on auth page and already logged in, redirect to dashboard
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        window.location.href = '/';
      }
    }
  });
});