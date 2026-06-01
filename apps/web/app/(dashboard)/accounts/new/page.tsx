import { NewAccountForm } from '@/components/forms/new-account-form';
import { WORKSPACES } from '@/lib/server/repositories';

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nova conta</h1>
      <NewAccountForm workspaces={WORKSPACES} />
    </div>
  );
}
