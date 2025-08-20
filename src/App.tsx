import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import "./style/darkMode.css";
import "./style/AppStyles.css";
import { AuthProvider } from "./contexts/AuthContext";
import { NetworkProvider } from "./contexts/NetworkContext";
import SessionTimeout from "./components/SessionTimeout";
import PWAInstallPrompt from "./components/PWAInstallPrompt/PWAInstallPrompt";
import NetworkStatusDetector from "./components/NetworkStatus/NetworkStatusDetector";
import NetworkStatusNotification from "./components/NetworkStatus/NetworkStatusNotification";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

// Lazy load all main page components
const Home = lazy(() => import("./components/Home/Home"));
const About = lazy(() => import("./components/About/About"));
const Contact = lazy(() => import("./components/Contact/Contact"));
const NotFound = lazy(() => import("./components/NotFound/NotFound"));
const Navbar = lazy(() => import("./components/Navbar/Navbar"));
const Footer = lazy(() => import("./components/Footer/Footer"));
const Product = lazy(() => import("./components/Product/Product"));
const ProjectDetails = lazy(
  () => import("./components/Product/ProjectDetails")
);
const Unauthorized = lazy(
  () => import("./components/Unauthorized/Unauthorized")
);
const Forbidden = lazy(() => import("./components/Forbidden/Forbidden"));
const ServerError = lazy(() => import("./components/ServerError/ServerError"));
const ConnectGoogle = lazy(() => import("./components/Data/ConnectGoogle"));
const OutOfStock = lazy(() => import("./components/OutOfStock/OutOfStock"));
const Login = lazy(() => import("./components/Login/Login"));
const Logout = lazy(() => import("./components/Logout/Logout"));
const OTP = lazy(() => import("./components/OTP/OTP"));
const ProtectedRoute = lazy(
  () => import("./components/ProtectedRoute/ProtectedRoute")
);
const Places = lazy(() => import("./components/Places/Places"));
const LocationProjects = lazy(
  () => import("./components/Places/LocationProjects")
);
{/*const NetworkStatusPage = lazy(
  () => import("./components/NetworkStatus/NetworkStatusPage")
);*/}
const NetworkLostPage = lazy(
  () => import("./components/NetworkStatus/NetworkLostPage")
);

function App() {
  return ()=><div>fix</div>
}

export default App;
