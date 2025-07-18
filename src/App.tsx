import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/product/:id" element={<Product />} />
            <Route
              path="/projects/:companyId/:projectId"
              element={<ProjectDetails />}
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="/server-error" element={<ServerError />} />
            <Route path="/connect-google" element={<ConnectGoogle />} />
            {/* Test route for OutOfStock */}
            <Route 
              path="/test-out-of-stock" 
              element={<OutOfStock 
                companyName="Test Company" 
                companyImage="https://placehold.co/800x600?text=Test+Company" 
              />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
