import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { auth, googleProvider, firestore } from '../../utils/firebaseConfig';
import Swal from 'sweetalert2';
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const checkAuth = async () => {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userSuid = userDoc.data().suid;
          navigate(`/dashboard/${userSuid}`);
        }
      };
      checkAuth();
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const randomUsername = `user${Math.floor(1000 + Math.random() * 9000)}`; // Generate random username
      await saveUserToFirestore(user, 'google', randomUsername);
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userSuid = userDoc.data().suid;
      navigate(`/dashboard/${userSuid}`);
      Swal.fire({
        icon: 'success',
        title: 'Login successful',
        text: 'You have logged in with Google.',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: 'Failed to login with Google. Please try again later.',
      });
    }
  };

  const handleSignup = async () => {
    if (await checkIfUsernameExists(username)) {
      setError('Username is already taken.');
      return;
    }

    if (password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must be at least 6 characters long and include uppercase, lowercase, number, and special character.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const randomSUID = Math.floor(1000000 + Math.random() * 9000000); // 7-digit random number
      await setDoc(doc(firestore, "users", user.uid), {
        name,
        email,
        uid: user.uid,
        suid: randomSUID,
        username,
        provider: 'email'
      });
      navigate(`/dashboard/${randomSUID}`);
      Swal.fire({
        icon: 'success',
        title: 'Signup successful',
        text: 'You have successfully signed up.',
      });
    } catch (error) {
      setError('Failed to sign up. Please ensure the email is not already in use and try again.');
      Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
        text: 'Failed to sign up. Please ensure the email is not already in use and try again.',
      });
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(firestore, 'users', auth.currentUser.uid));
      const userSuid = userDoc.data().suid;
      navigate(`/dashboard/${userSuid}`);
      Swal.fire({
        icon: 'success',
        title: 'Login successful',
        text: 'You have logged in successfully.',
      });
    } catch (error) {
      setError('Failed to log in. Please check your email and password and try again.');
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: 'Failed to log in. Please check your email and password and try again.',
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Swal.fire({
        icon: 'warning',
        title: 'Forgot Password',
        text: 'Please enter your email to reset your password.',
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Swal.fire({
        icon: 'success',
        title: 'Password Reset',
        text: 'Password reset email has been sent to your email address.',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send password reset email. Please try again later.',
      });
    }
  };

  const checkIfUsernameExists = async (username) => {
    const q = query(collection(firestore, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const saveUserToFirestore = async (user, provider, username) => {
    const uid = user.uid;
    const userName = user.displayName || "Anonymous";
    const userEmail = user.email;
    const randomSUID = Math.floor(1000000 + Math.random() * 9000000); // 7-digit random number

    await setDoc(doc(firestore, "users", uid), {
      name: userName,
      email: userEmail,
      suid: randomSUID,
      uid: uid,
      username,
      provider
    });
  };

  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-200 to-purple-200 p-4">
      <div className="container p-8 rounded-lg shadow-lg w-full max-w-md bg-white">
        {isLogin ? (
          <>
            <h1 className="text-3xl font-bold mb-6 text-center">Welcome Zest 😀</h1>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash className="text-gray-500" /> : <FaEye className="text-gray-500" />}
              </span>
            </div>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full p-3 bg-blue-500 text-white rounded-lg mb-4 hover:bg-blue-600 transition duration-300 ease-in-out"
            >
              Login
            </button>
            <button
              onClick={handleGoogleLogin}
              className="w-full p-3 bg-red-500 text-white rounded-lg mb-4 flex items-center justify-center space-x-2 hover:bg-red-600 transition duration-300 ease-in-out"
            >
              <FaGoogle className="text-xl" />
              <span>Login with Google</span>
            </button>
            <button
              onClick={handleForgotPassword}
              className="text-blue-500 font-semibold mb-4"
            >
              Forgot Password?
            </button>
            <p className="text-center mt-4">
              Don't have an account? <button onClick={() => setIsLogin(false)} className="text-blue-500 font-semibold">Sign Up</button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-6 text-center">Start Your Journey - ⭐</h1>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 mb-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash className="text-gray-500" /> : <FaEye className="text-gray-500" />}
              </span>
            </div>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <button
              onClick={handleSignup}
              className="w-full p-3 bg-blue-500 text-white rounded-lg mb-4 hover:bg-blue-600 transition duration-300 ease-in-out"
            >
              Sign Up
            </button>
            <p className="text-center mt-4">
              Already have an account? <button onClick={() => setIsLogin(true)} className="text-blue-500 font-semibold">Log In</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
