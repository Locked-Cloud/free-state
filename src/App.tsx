import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import Home from "./components/Home/Home";
import About from "./components/About/About";
import Contact from "./components/Contact/Contact";
import NotFound from "./components/NotFound/NotFound";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Product from "./components/Product/Product";
import ProjectDetails from "./components/Product/ProjectDetails";
import Unauthorized from "./components/Unauthorized/Unauthorized";
import Forbidden from "./components/Forbidden/Forbidden";
import ServerError from "./components/ServerError/ServerError";
import ConnectGoogle from "./components/Data/ConnectGoogle";
import OutOfStock from "./components/OutOfStock/OutOfStock";
import Login from "./components/Login/Login";
import Logout from "./components/Logout/Logout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
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
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
