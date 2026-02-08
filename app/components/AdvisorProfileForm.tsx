"use client";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Camera,
  Upload,
  User,
  Calendar,
  Briefcase,
  Mail,
  Sparkles,
  Phone,
  Lock,
  Award,
  ChevronDown,
} from "lucide-react";

export const SPECIALIZATION_OPTIONS = [
  "Nutrition & Diet",
  "Fitness",
  "Mental Health",
  "General Medicine",
  "Sexual Health",
  "Chronic Diseases",
  "Skin & Beauty",
  "Addiction",
  "Finance",
  "CA Taxes",
  "Lawyer",
  "Government",
  "Career Coach",
  "Shopping",
  "Relationship",
  "Astro",
];

export type AdvisorFormMode = "create" | "edit";

export interface AdvisorFormValues {
  name: string;
  age: string;
  experience: string;
  degree: string[];
  specialization: string[];
  certification: string[];
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  profilePhoto: string;
  location: string;
  about: string;
}

export interface AdvisorFormSubmitPayload extends AdvisorFormValues {
  photoFile: File | null;
}

interface AdvisorProfileFormProps {
  mode?: AdvisorFormMode;
  initialValues?: Partial<AdvisorFormValues>;
  onSubmit: (values: AdvisorFormSubmitPayload) => void | Promise<void>;
  loading?: boolean;
  message?: string | null;
  messageVariant?: "success" | "error" | "info";
  submitLabel?: string;
  loadingLabel?: string;
  heading?: string;
  subheading?: string;
  footerContent?: ReactNode;
  formClassName?: string;
}

const MESSAGE_COLOR: Record<NonNullable<AdvisorProfileFormProps["messageVariant"]>, string> = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-blue-600",
};

const toStringValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

const createInitialValues = (
  initial?: Partial<AdvisorFormValues>
): AdvisorFormValues => {
  const specialization = Array.isArray(initial?.specialization)
    ? initial!.specialization.filter((item): item is string => typeof item === "string")
    : [];

  const degree = Array.isArray(initial?.degree)
    ? initial!.degree.filter((item): item is string => typeof item === "string")
    : [];

  const certification = Array.isArray(initial?.certification)
    ? initial!.certification.filter((item): item is string => typeof item === "string")
    : [];

  const password = typeof initial?.password === "string" ? initial.password : "";
  const confirmPassword =
    typeof initial?.confirmPassword === "string"
      ? initial.confirmPassword
      : password;

  return {
    name: typeof initial?.name === "string" ? initial.name : "",
    age: toStringValue(initial?.age),
    experience: toStringValue(initial?.experience),
    degree,
    specialization,
    certification,
    email: typeof initial?.email === "string" ? initial.email : "",
    phone: toStringValue(initial?.phone),
    password,
    confirmPassword,
    profilePhoto:
      typeof initial?.profilePhoto === "string" ? initial.profilePhoto : "",
    location: typeof initial?.location === "string" ? initial.location : "",
    about: typeof initial?.about === "string" ? initial.about : "",
  };
};

export default function AdvisorProfileForm({
  mode = "create",
  initialValues,
  onSubmit,
  loading = false,
  message,
  messageVariant = "info",
  submitLabel,
  loadingLabel,
  heading,
  subheading,
  footerContent,
  formClassName,
}: AdvisorProfileFormProps) {
  const [formValues, setFormValues] = useState<AdvisorFormValues>(
    createInitialValues(initialValues)
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initialValues?.profilePhoto ?? null
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [showSpecializationDropdown, setShowSpecializationDropdown] =
    useState(false);
  const [newDegree, setNewDegree] = useState<string>("");
  const [newCertification, setNewCertification] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFormValues(createInitialValues(initialValues));
    setPhotoFile(null);
    setPreview(initialValues?.profilePhoto ?? null);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
  }, [initialValues]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!showSpecializationDropdown) return;
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowSpecializationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showSpecializationDropdown]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const isEditMode = mode === "edit";
  const resolvedSubmitLabel =
    submitLabel ?? (isEditMode ? "Save Changes" : "Sign Up");
  const resolvedLoadingLabel =
    loadingLabel ?? (isEditMode ? "Saving..." : "Processing...");
  const resolvedHeading =
    heading ?? (isEditMode ? "Edit Advisor Profile" : "Advisor Profile");
  const passwordPlaceholder = isEditMode
    ? "Enter new password (optional)"
    : "Enter password";
  const confirmPlaceholder = isEditMode
    ? "Confirm new password (optional)"
    : "Confirm password";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpecializationToggle = (specialization: string) => {
    setFormValues((prev) => {
      const isSelected = prev.specialization.includes(specialization);
      const specializationList = isSelected
        ? prev.specialization.filter((item) => item !== specialization)
        : [...prev.specialization, specialization];
      return { ...prev, specialization: specializationList };
    });
  };

  const handleAddDegree = () => {
    const trimmedDegree = newDegree.trim();
    if (trimmedDegree && !formValues.degree.includes(trimmedDegree)) {
      setFormValues((prev) => ({
        ...prev,
        degree: [...prev.degree, trimmedDegree],
      }));
      setNewDegree("");
    }
  };

  const handleRemoveDegree = (index: number) => {
    setFormValues((prev) => ({
      ...prev,
      degree: prev.degree.filter((_, i) => i !== index),
    }));
  };

  const handleAddCertification = () => {
    const trimmedCert = newCertification.trim();
    if (trimmedCert && !formValues.certification.includes(trimmedCert)) {
      setFormValues((prev) => ({
        ...prev,
        certification: [...prev.certification, trimmedCert],
      }));
      setNewCertification("");
    }
  };

  const handleRemoveCertification = (index: number) => {
    setFormValues((prev) => ({
      ...prev,
      certification: prev.certification.filter((_, i) => i !== index),
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }

    const newObjectUrl = URL.createObjectURL(file);
    setPhotoFile(file);
    setPreview(newObjectUrl);
    setObjectUrl(newObjectUrl);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sanitizedValues: AdvisorFormValues = {
      name: formValues.name.trim(),
      age: formValues.age.trim(),
      experience: formValues.experience.trim(),
      degree: formValues.degree.map((d) => d.trim()).filter(d => d),
      specialization: [...formValues.specialization],
      certification: formValues.certification.map((c) => c.trim()).filter(c => c),
      email: formValues.email.trim(),
      phone: formValues.phone.trim(),
      password: formValues.password,
      confirmPassword: formValues.confirmPassword,
      profilePhoto: formValues.profilePhoto.trim(),
      location: formValues.location.trim(),
      about: formValues.about.trim(),
    };

    await onSubmit({ ...sanitizedValues, photoFile });
  };

  const formClasses =
    formClassName ??
    "bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 space-y-4 border border-blue-200";

  return (
    <form onSubmit={handleSubmit} className={formClasses}>
      {(resolvedHeading || subheading) && (
        <div className="text-center space-y-1">
          {resolvedHeading && (
            <h2 className="text-3xl font-bold text-center text-blue-500">
              {resolvedHeading}
            </h2>
          )}
          {subheading && (
            <p className="text-center text-blue-600 text-lg">{subheading}</p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className="relative w-28 h-28 rounded-full border-4 border-blue-200 flex items-center justify-center bg-gray-100 overflow-hidden">
          {preview ? (
            <Image
              src={preview}
              alt="Profile Preview"
              width={112}
              height={112}
              className="w-full h-full object-cover"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <Camera size={40} className="text-gray-400" />
          )}
          <label
            htmlFor="advisor-profile-photo"
            className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
          >
            <Upload size={24} className="text-white" />
          </label>
        </div>
        <input
          id="advisor-profile-photo"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <span className="text-[16px] text-blue-500 mt-2">Upload Profile Photo</span>
      </div>

      <div className="space-y-5">
        <div className="group">
          <label className="flex items-center gap-2 text-blue-600 font-medium text-lg mb-2">
            <User size={20} />
            Name
          </label>
          <input
            name="name"
            placeholder="Enter full name"
            value={formValues.name}
            onChange={handleChange}
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Calendar size={20} />
              Age
            </label>
            <input
              name="age"
              type="number"
              placeholder="Enter age"
              value={formValues.age}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
              disabled={loading}
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Briefcase size={20} />
              Experience (years)
            </label>
            <input
              name="experience"
              type="number"
              placeholder="e.g., 5"
              value={formValues.experience}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Award size={20} />
            Degrees
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., MBBS, MSc Nutrition, BPharm"
                value={newDegree}
                onChange={(e) => setNewDegree(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDegree();
                  }
                }}
                className="flex-1 bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddDegree}
                className="px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
                disabled={loading || !newDegree.trim()}
              >
                Add
              </button>
            </div>
            {formValues.degree.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formValues.degree.map((deg, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                  >
                    {deg}
                    <button
                      type="button"
                      onClick={() => handleRemoveDegree(index)}
                      className="ml-2 text-blue-500 hover:text-blue-700 font-bold"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="group relative" ref={dropdownRef}>
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Sparkles size={20} />
            Specialization
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setShowSpecializationDropdown((prev) => !prev)
              }
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200 text-left flex items-center justify-between"
              disabled={loading}
            >
              <span
                className={
                  formValues.specialization.length === 0
                    ? "text-gray-400"
                    : "text-black"
                }
              >
                {formValues.specialization.length === 0
                  ? "Select specializations..."
                  : `${formValues.specialization.length} selected`}
              </span>
              <ChevronDown
                size={20}
                className={`transition-transform ${
                  showSpecializationDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSpecializationDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                {SPECIALIZATION_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-3 hover:bg-blue-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formValues.specialization.includes(option)}
                      onChange={() => handleSpecializationToggle(option)}
                      className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {formValues.specialization.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {formValues.specialization.map((spec) => (
                <span
                  key={spec}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {spec}
                  <button
                    type="button"
                    onClick={() => handleSpecializationToggle(spec)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    disabled={loading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Award size={20} />
            Certifications
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Certified Nutritionist, Licensed Therapist"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCertification();
                  }
                }}
                className="flex-1 bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddCertification}
                className="px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
                disabled={loading || !newCertification.trim()}
              >
                Add
              </button>
            </div>
            {formValues.certification.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formValues.certification.map((cert, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => handleRemoveCertification(index)}
                      className="ml-2 text-blue-500 hover:text-blue-700 font-bold"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Mail size={20} />
            Email
          </label>
          <input
            name="email"
            type="email"
            placeholder="your.email@example.com"
            value={formValues.email}
            onChange={handleChange}
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            required
            disabled={loading}
          />
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Phone size={20} />
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="+1234567890"
            value={formValues.phone}
            onChange={handleChange}
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            required
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Include country code (e.g., +1 for US, +91 for India)
          </p>
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Briefcase size={20} />
            Location
          </label>
          <input
            name="location"
            type="text"
            placeholder="e.g., New York, USA"
            value={formValues.location}
            onChange={handleChange}
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            required
            disabled={loading}
          />
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Sparkles size={20} />
            About
          </label>
          <textarea
            name="about"
            placeholder="Tell us about your expertise and experience..."
            value={formValues.about}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, about: e.target.value }))
            }
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200 resize-none h-24"
            required
            disabled={loading}
          />
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Lock size={20} />
            Password
          </label>
          <input
            name="password"
            type="password"
            placeholder={passwordPlaceholder}
            value={formValues.password}
            onChange={handleChange}
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            required={mode === "create"}
            minLength={mode === "create" ? 6 : undefined}
            disabled={loading}
          />
          {isEditMode && (
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to keep the existing password.
            </p>
          )}
        </div>

        <div className="group">
          <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
            <Lock size={20} />
            Confirm Password
          </label>
          <input
            name="confirmPassword"
            type="password"
            placeholder={confirmPlaceholder}
            value={formValues.confirmPassword}
            onChange={handleChange}
            className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            required={mode === "create"}
            minLength={mode === "create" ? 6 : undefined}
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? resolvedLoadingLabel : resolvedSubmitLabel}
      </button>

      {footerContent}

      {message && (
        <p
          className={`text-center mt-3 text-sm ${
            MESSAGE_COLOR[messageVariant] ?? MESSAGE_COLOR.info
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
