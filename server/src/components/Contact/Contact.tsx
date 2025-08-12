import React, { useState } from "react";
import styles from "./Contact.module.css";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.length < 10) {
      newErrors.message = "Message must be at least 10 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setStatus({
        type: "error",
        message: "Please fix the errors in the form",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: null, message: "" });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

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
    } catch (error) {
      setStatus({
        type: "error",
        message: "Failed to send message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Contact Us</h1>
        <p className={styles.subtitle}>
          Have questions? We'd love to hear from you. Send us a message and
          we'll respond as soon as possible.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.contactInfo}>
          <div className={styles.infoCard}>
            <i className="fas fa-map-marker-alt"></i>
            <h3>Our Location</h3>
            <p>Cairo, Egypt</p>
          </div>
          <div className={styles.infoCard}>
            <i className="fas fa-phone"></i>
            <h3>Phone Number</h3>
            <p>+20 123 456 789</p>
          </div>
          <div className={styles.infoCard}>
            <i className="fas fa-envelope"></i>
            <h3>Email Address</h3>
            <p>info@freestate.com</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="name">
              Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? styles.error : ""}
              placeholder="Your name"
              disabled={isSubmitting}
            />
            {errors.name && (
              <span className={styles.errorText}>{errors.name}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">
              Email <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? styles.error : ""}
              placeholder="your@email.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="subject">
              Subject <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={errors.subject ? styles.error : ""}
              placeholder="What is this about?"
              disabled={isSubmitting}
            />
            {errors.subject && (
              <span className={styles.errorText}>{errors.subject}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="message">
              Message <span className={styles.required}>*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              className={errors.message ? styles.error : ""}
              placeholder="Your message here..."
              rows={5}
              disabled={isSubmitting}
            />
            {errors.message && (
              <span className={styles.errorText}>{errors.message}</span>
            )}
          </div>

          {status.message && (
            <div
              className={`${styles.statusMessage} ${
                status.type === "success" ? styles.success : styles.error
              }`}
            >
              {status.type === "success" && (
                <i className="fas fa-check-circle"></i>
              )}
              {status.type === "error" && (
                <i className="fas fa-exclamation-circle"></i>
              )}
              {status.message}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner}></span>
                Sending...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Send Message
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
