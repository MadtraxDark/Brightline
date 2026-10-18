import { authorizedRequest } from "./session.js";
import { getRadiographImageUrl } from "../radiographApi.js";

export function hasLinkedRadiograph(report) {
  return Boolean(report?.image_file_id || report?.dataset_filename);
}

export async function loadReportImage(report) {
  if (report?.image_file_id) {
    const data = await authorizedRequest(
      `/files/${encodeURIComponent(report.image_file_id)}/signed-url`,
      { method: "POST" },
    );
    return data?.url || "";
  }
  if (report?.dataset_filename)
    return getRadiographImageUrl(report.dataset_filename);
  return "";
}
