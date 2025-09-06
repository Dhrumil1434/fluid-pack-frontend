export interface QAMachineEntry {
  _id: string;
  machine_id: {
    _id: string;
    name: string;
    category_id: {
      _id: string;
      name: string;
    };
  };
  added_by: {
    _id: string;
    username: string;
    email: string;
  };
  report_link: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQAMachineEntryRequest {
  machine_id: string;
  report_link: string;
  files?: string[];
}

export interface UpdateQAMachineEntryRequest {
  report_link?: string;
  files?: string[];
}

export interface QAMachineFilters {
  machine_id?: string;
  added_by?: string;
  page?: number;
  limit?: number;
}
