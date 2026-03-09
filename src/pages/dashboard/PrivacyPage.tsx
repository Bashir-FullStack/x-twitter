import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Privacy Policy</h1>
      </div>
      <div className="p-6 space-y-6 text-[15px] leading-relaxed">
        <p className="text-muted-foreground">Last updated: March 2026</p>
        <section><h2 className="font-display font-bold text-lg mb-2">1. Information We Collect</h2><p className="text-muted-foreground">We collect information you provide directly: email, display name, profile information, posts, messages, and interactions. We also collect usage data such as device information and activity logs.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">2. How We Use Information</h2><ul className="text-muted-foreground space-y-1 list-disc pl-5"><li>To provide and maintain the platform</li><li>To personalize your experience</li><li>To send notifications about activity</li><li>To improve our services</li><li>To enforce our terms and policies</li></ul></section>
        <section><h2 className="font-display font-bold text-lg mb-2">3. Information Sharing</h2><p className="text-muted-foreground">We do not sell your personal information. Your public posts and profile are visible to all users. Private messages are only visible to participants. We may share information with law enforcement when required.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">4. Data Security</h2><p className="text-muted-foreground">We implement security measures including encryption, access controls, and regular audits. However, no method of transmission over the Internet is 100% secure.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">5. Your Rights</h2><ul className="text-muted-foreground space-y-1 list-disc pl-5"><li>Access your personal data</li><li>Correct inaccurate data</li><li>Delete your account and data</li><li>Export your data</li><li>Control your privacy settings</li></ul></section>
        <section><h2 className="font-display font-bold text-lg mb-2">6. Cookies</h2><p className="text-muted-foreground">We use essential cookies for authentication and session management. We do not use tracking cookies for advertising.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">7. Data Retention</h2><p className="text-muted-foreground">We retain your data as long as your account is active. Upon account deletion, we remove your data within 30 days.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">8. Contact</h2><p className="text-muted-foreground">For privacy questions, contact us through the Help Center.</p></section>
      </div>
    </div>
  );
};

export default PrivacyPage;
