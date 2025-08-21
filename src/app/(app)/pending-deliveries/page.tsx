

import DeliveryValidationClient from "../workflow/delivery-validation-client";

export default function PendingDeliveriesPage() {
  const config = {
    title: "Pending Deliveries",
    description: "Documents awaiting your review and approval.",
    emptyStateText: "There are no pending deliveries.",
    dataStatus: "Pending Validation",
    dataType: 'book',
    viewType: 'folder',
  };
  
  return <DeliveryValidationClient config={config} />;
}

