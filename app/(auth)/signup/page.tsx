"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AdvisorProfileForm, {
  AdvisorFormSubmitPayload,
} from "@/app/components/AdvisorProfileForm";

type FeedbackState = {
  text: string;
  variant: "success" | "error" | "info";
} | null;

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const router = useRouter();

  const handleSubmit = async (values: AdvisorFormSubmitPayload) => {
    setLoading(true);
    setFeedback(null);

    try {
      if (values.password.length < 6) {
        setFeedback({
          text: "Password must be at least 6 characters long.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      if (values.password !== values.confirmPassword) {
        setFeedback({
          text: "Passwords do not match. Please re-enter them.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      if (values.specialization.length === 0) {
        setFeedback({
          text: "Please select at least one specialization.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      if (values.degree.length === 0) {
        setFeedback({
          text: "Please add at least one degree.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      if (values.certification.length === 0) {
        setFeedback({
          text: "Please add at least one certification.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      if (values.location.trim().length === 0) {
        setFeedback({
          text: "Please enter your location.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      if (values.about.trim().length === 0) {
        setFeedback({
          text: "Please tell us about yourself.",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      let formattedPhone = values.phone;
      if (formattedPhone && !formattedPhone.startsWith("+")) {
        formattedPhone = `+${formattedPhone}`;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      let photoURL = values.profilePhoto;
      if (values.photoFile) {
        const storageRef = ref(
          storage,
          `profilePhotos/${values.photoFile.name}-${Date.now()}`
        );
        await uploadBytes(storageRef, values.photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "advisors"), {
        uid: userCredential.user.uid,
        name: values.name.trim().replace(/\s+/g, " "),
        age: values.age,
        experience: values.experience,
        degree: values.degree,
        specialization: values.specialization,
        certification: values.certification,
        email: values.email.trim(),
        phone: formattedPhone,
        profilePhoto: photoURL,
        password: values.password,
        location: values.location,
        about: values.about,
        busy: false,
        isActive: true,
        totalUsersAttended: 0,
        createdAt: new Date(),
      });

      setFeedback({
        text: "Account created successfully! Redirecting to dashboard...",
        variant: "success",
      });

      router.push("/advisor/dashboard");
    } catch (error: unknown) {
      console.error("Firebase Auth Error:", error);

      let errorMessage = "An error occurred. Please try again.";
      if (typeof error === "object" && error !== null) {
        const err = error as { code?: string; message?: string };
        switch (err.code) {
          case "auth/email-already-in-use":
            errorMessage =
              "An account with this email already exists. Please login instead.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/weak-password":
            errorMessage =
              "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
            break;
          case "auth/operation-not-allowed":
            errorMessage =
              "Email/password sign-up is not enabled. Please contact support.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many requests. Please wait before trying again.";
            break;
          default:
            errorMessage = err.message ?? errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setFeedback({ text: errorMessage, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white py-4 overflow-auto relative">
      <AdvisorProfileForm
        onSubmit={handleSubmit}
        loading={loading}
        message={feedback?.text ?? null}
        messageVariant={feedback?.variant ?? "info"}
        loadingLabel="Creating Account..."
        heading="Sign Up as Advisor"
        subheading="Create your advisor profile"
        footerContent={
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-blue-500 font-medium hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        }
      />
    </div>
  );
}