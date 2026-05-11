import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Create Account | Hornet3000 AI System"
        description="Register for a new account to join the Hornet3000 Smart Hive Monitoring and Real-time Threat Detection network."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}