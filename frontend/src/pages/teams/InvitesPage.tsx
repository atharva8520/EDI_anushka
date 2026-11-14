import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Check, X, Users, AlertCircle, ArrowRight } from "lucide-react";
import { api, apiError } from "../../api/client";
import type { Invite } from "../../types";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card, EmptyState, Skeleton, ErrorState } from "../../components/States";
import { PageIntro } from "../../components/PageIntro";

export function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  function fetchInvites() {
    setLoading(true);
    setError(null);
    api
      .get<Invite[]>("/invites")
      .then((res) => {
        setInvites(res.data);
      })
      .catch((err) => {
        setError(apiError(err, "Failed to load team invitations"));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchInvites();
  }, []);

  async function handleRespond(inviteId: string, accept: boolean) {
    setProcessingId(inviteId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.post(`/invites/${inviteId}/respond?accept=${accept}`);
      window.dispatchEvent(new CustomEvent("refresh-invites"));

      if (accept) {
        setActionSuccess("Successfully joined the team! Redirecting to team workspace...");
        setTimeout(() => {
          navigate("/app/team");
        }, 1200);
      } else {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
        setActionSuccess("Invitation declined.");
      }
    } catch (err) {
      setActionError(apiError(err, accept ? "Failed to accept invite" : "Failed to decline invite"));
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-6">
      <PageIntro
        kicker="Collaboration"
        title="Team Invitations"
        body="Review and respond to invitations from hackathon team leaders."
      />

      {actionSuccess ? (
        <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      ) : null}

      {actionError ? (
        <div className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">{actionError}</div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInvites} />
      ) : invites.length === 0 ? (
        <EmptyState
          title="No pending invitations"
          body="You do not have any pending team invitations at the moment. You can browse active hackathons to find or create a squad."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/app/team">
                <Button variant="primary" className="gap-2">
                  <Users className="h-4 w-4" />
                  My Team Hub
                </Button>
              </Link>
              <Link to="/app/hackathons">
                <Button variant="secondary" className="gap-2">
                  Browse Hackathons
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4">
          {invites.map((invite) => {
            const isProcessing = processingId === invite.id;
            const dateStr = new Date(invite.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card key={invite.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-ink truncate">{invite.team_name}</h4>
                      <Badge tone="primary">{invite.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-mute">
                      Event: <span className="font-semibold text-ink">{invite.hackathon_name}</span>
                    </p>
                    <p className="text-xs text-mute/80 mt-0.5">Invited on {dateStr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="secondary"
                    className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    disabled={isProcessing}
                    onClick={() => handleRespond(invite.id, false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    className="gap-1.5 text-xs"
                    disabled={isProcessing}
                    onClick={() => handleRespond(invite.id, true)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isProcessing ? "Processing..." : "Accept"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
