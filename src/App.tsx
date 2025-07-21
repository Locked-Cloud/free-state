import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
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
const ProtectedRoute = lazy(
  () => import("./components/ProtectedRoute/ProtectedRoute")
);
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Suspense fallback={<div className="loading">Loading...</div>}>
            <Navbar />
            <main className="content">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected routes - require authentication */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <About />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contact"
                  element={
                    <ProtectedRoute>
                      <Contact />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/logout"
                  element={
                    <ProtectedRoute>
                      <Logout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/product/:id"
                  element={
                    <ProtectedRoute>
                      <Product />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:companyId/:projectId"
                  element={
                    <ProtectedRoute>
                      <ProjectDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/unauthorized"
                  element={
                    <ProtectedRoute>
                      <Unauthorized />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forbidden"
                  element={
                    <ProtectedRoute>
                      <Forbidden />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/server-error"
                  element={
                    <ProtectedRoute>
                      <ServerError />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/connect-google"
                  element={
                    <ProtectedRoute>
                      <ConnectGoogle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test-out-of-stock"
                  element={
                    <ProtectedRoute>
                      <OutOfStock
                        companyName="Test Company"
                        companyImage="https://placehold.co/800x600?text=Test+Company"
                      />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all route for 404 and unknown routes */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <NotFound />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            <Footer />
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
