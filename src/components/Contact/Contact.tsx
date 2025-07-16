import React, { useState } from "react";
import styles from "./Contact.module.css";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log("Form submitted:", formData);

    // Simulate a successful submission
    setStatus({
      type: "success",
      message: "Thank you for your message. We will get back to you soon!",
    });

    // Reset form
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Contact Us</h1>
        <p className={styles.subtitle}>
          Get in touch with us for any questions or inquiries
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.contactInfo}>
          <div className={styles.infoCard}>
            <div className={styles.icon}>📍</div>
            <h3>Address</h3>
            <p>123 Real Estate Street</p>
            <p>Cairo, Egypt</p>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.icon}>📞</div>
            <h3>Phone</h3>
            <p>+20 123 456 789</p>
            <p>Mon-Fri, 9am-6pm</p>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.icon}>✉️</div>
            <h3>Email</h3>
            <p>info@freestate.com</p>
            <p>support@freestate.com</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {status.type && (
            <div
              className={`${styles.alert} ${
                status.type === "success" ? styles.success : styles.error
              }`}
            >
              {status.message}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your name"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Your email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="Subject"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Your message"
              rows={5}
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
