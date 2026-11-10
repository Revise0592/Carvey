import { FileBadge } from "lucide-react";
import { deleteAttachmentAction } from "@/app/actions";
import { AttachmentSection } from "@/components/AttachmentSection";
import { EditRenewalForm, RenewalForm } from "@/components/Forms";
import { RecordItem } from "@/components/RecordItem";
import { groupAttachmentsByRecord, listRenewals } from "@/lib/db";
import { daysUntil } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import { renewalTypeLabels } from "@/lib/renewals";
import { EmptyRecords, type SectionProps } from "./shared";

export function RenewalsSection({ vehicle, settings, query }: SectionProps) {
  const renewals = listRenewals(vehicle.id);
  const attachments = groupAttachmentsByRecord(vehicle.id, "renewal");
  const deleteAttachment = deleteAttachmentAction.bind(null, vehicle.id);
  const current = new Set<number>();
  const seenTypes = new Set<string>();
  for (const renewal of renewals) {
    if (seenTypes.has(renewal.type)) continue;
    seenTypes.add(renewal.type);
    current.add(renewal.id);
  }

  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><FileBadge size={19} /> Renewals</h2>
        <RenewalForm vehicleId={vehicle.id} autoOpenKey={query.new} />
      </div>
      {renewals.length ? (
        <div className="record-list">
          {renewals.map((renewal) => {
            const days = daysUntil(renewal.endDate);
            const isCurrent = current.has(renewal.id);
            const tone = !isCurrent ? "tag-neutral" : days < 0 ? "tag-danger" : days <= 30 ? "tag-warning" : "tag-success";
            const status = !isCurrent ? "Previous" : days < 0 ? "Expired" : days <= 30 ? "Due soon" : "Active";
            return (
              <RecordItem
                key={renewal.id}
                tag={<span className={`tag ${tone}`}>{status}</span>}
                title={[renewalTypeLabels[renewal.type], renewal.provider].filter(Boolean).join(" · ")}
                meta={[
                  renewal.startDate ? `${formatDate(renewal.startDate, settings)} – ${formatDate(renewal.endDate, settings)}` : `Ends ${formatDate(renewal.endDate, settings)}`,
                  renewal.reference ? `Ref ${renewal.reference}` : null
                ].filter(Boolean).join(" · ")}
                value={formatCurrency(renewal.cost, settings)}
                actions={<EditRenewalForm record={renewal} />}
                attachments={<AttachmentSection attachments={attachments.get(renewal.id) ?? []} deleteAction={deleteAttachment} recordType="renewal" recordId={renewal.id} vehicleId={vehicle.id} />}
              />
            );
          })}
        </div>
      ) : (
        <EmptyRecords title="No renewals logged">
          Track insurance, road tax, warranties and breakdown cover. Each one gets a reminder for its renewal date.
        </EmptyRecords>
      )}
    </section>
  );
}
