import React, { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { Card, Form, Button } from "@themesberg/react-bootstrap";
import {
  getDetailRequest,
  updateUserProcess,
  requestDone,
} from "../../api/requestApi";
import { getAllUserTeam } from "../../api/userApi";
import { toast } from "react-toastify";
import moment from "moment-timezone";
import { Routes } from "../../routes";

export default function DetailRequest() {
  const { id } = useParams();
  const history = useHistory();
  const [detailRequest, setDetailRequest] = useState([]);
  const [teams, setTeams] = useState([]);
  let statusVariant = "";
  let statusText = "";
  const level = localStorage.getItem("level");

  useEffect(() => {
    (async () => {
      try {
        const getDetail = await getDetailRequest(id);
        const getUserTeam = await getAllUserTeam();
        setDetailRequest([getDetail.data.data]);
        setTeams(getUserTeam.data.data);
      } catch (error) {
        toast.warning("Something went wrong when fetching request data :(");
        window.history.back();
        console.log(error);
      }
    })();
  }, [id]);

  const handleChangeUserProcess = async (e, id) => {
    try {
      detailRequest.map((item) => {
        if ((item.id || item._id) === id) {
          item.user_process = e.target.value;
        }
        return item;
      });
      await updateUserProcess(e.target.value, id);

      toast.success("Successfully choose user process!");
      history.push(`/ticketing/detail-request/${id}`);
    } catch (error) {
      toast.error("Something went wrong!");
      console.log(error);
    }
  };

  const handleDoneRequest = async (id) => {
    try {
      await requestDone(id);

      detailRequest.map((item) => {
        if ((item.id || item._id) === id) {
          item.ticket_status = "D";
        }
        return item;
      });
      toast.success("Successfully request done!");
      history.push(`/ticketing/detail-request/${id}`);
    } catch (error) {
      toast.error("Something went wrong!");
      console.log(error);
    }
  };

  return (
    <div className="mt-3">
      <Card border="light" className="shadow-sm p-3">
        {detailRequest.map((data) => {
          if (data.ticket_status === "W") {
            statusVariant = "warning";
            statusText = "Waiting";
          } else if (data.ticket_status === "P") {
            statusVariant = "info";
            statusText = "ON Progress";
          } else if (data.ticket_status === "D") {
            statusVariant = "warning";
            statusText = "Done (Waiting User Confirmation)";
          } else if (data.ticket_status === "C") {
            statusVariant = "success";
            statusText = "Closed";
          } else if (data.ticket_status === "E") {
            statusVariant = "info";
            statusText = "Escalated";
          } else {
            statusVariant = "danger";
            statusText = "Rejected";
          }

          const requestsDetail =
            data.requests_detail || data.detail || {
              title_request: "",
              subject_request: "",
            };
          // Support old DB field spelling for existing documents
          const subjectRequest =
            requestsDetail.subject_request ?? requestsDetail.subjek_request ?? "";

          const fileObj =
            data.file || data.files || { image: "", file_document: "" };

          const priority =
            data.priority === "Critical" ? "High" : (data.priority || "Medium");
          let priorityVariant = "secondary";
          if (priority === "High") {
            priorityVariant = "warning";
          } else if (priority === "Medium") {
            priorityVariant = "info";
          } else if (priority === "Low") {
            priorityVariant = "success";
          }

          return (
            <div key={data.id || data._id}>
              <p className="display-4">{requestsDetail.title_request}</p>
              <div className="d-flex">
                <ul className="me-5">
                  <li className="py-2 fs-5">
                    ID Request: <b>{data.id || data._id}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Title Request: <b>{requestsDetail.title_request}</b>
                  </li>
                  <li className="py-2 fs-5">
                    User Request: <b>{data.user_request}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Category Request: <b>{data.category}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Email Request: <b>{data.email_request}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Department: <b>{data.department}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Create Date Request:{" "}
                    <b>
                      {moment(data.createdAt)
                        .month(1)
                        .format("DD-MM-YYYY HH:mm")}
                    </b>
                  </li>
                  <li className="py-2 fs-5">
                    Processing Start Date:{" "}
                    <b>
                      {data.start_process_ticket || data.createdAt
                        ? moment(data.start_process_ticket || data.createdAt).format(
                            "DD-MM-YYYY HH:mm"
                          )
                        : "Not started"}
                    </b>
                  </li>
                  <li className="py-2 fs-5">
                    Processing End Date:{" "}
                    <b>
                      {data.end_date_ticket
                        ? moment(data.end_date_ticket).format("DD-MM-YYYY HH:mm")
                        : "Not completed"}
                    </b>
                  </li>
                  <li className="py-2 fs-5">
                    Time Taken:{" "}
                    <b>
                      {(() => {
                        const accumulatedMs = data.accumulated_time_ms || 0;
                        let currentElapsedMs = 0;

                        // Calculate current elapsed time if ticket is in progress (status P)
                        if (data.start_process_ticket && data.ticket_status === "P") {
                          const start = moment(data.start_process_ticket);
                          const now = moment();
                          currentElapsedMs = now.diff(start);
                        }
                        // If ticket is Done (status D), start_process_ticket should be null and time is in accumulated_time_ms
                        // If ticket is Closed (status C), use accumulated time only

                        const totalMs = accumulatedMs + currentElapsedMs;

                        if (totalMs === 0) {
                          // Fallback: if no accumulated time and ticket is Done/Closed, try to calculate from dates
                          if ((data.ticket_status === "D" || data.ticket_status === "C") && data.end_date_ticket && data.createdAt) {
                            const start = moment(data.createdAt);
                            const end = moment(data.end_date_ticket);
                            const fallbackMs = end.diff(start);
                            if (fallbackMs > 0) {
                              const duration = moment.duration(fallbackMs);
                              const days = Math.floor(duration.asDays());
                              const hours = duration.hours();
                              const minutes = duration.minutes();
                              let timeStr = "";
                              if (days > 0) {
                                timeStr += `${days} day${days > 1 ? "s" : ""}`;
                              }
                              if (hours > 0) {
                                if (timeStr) timeStr += ", ";
                                timeStr += `${hours} hour${hours !== 1 ? "s" : ""}`;
                              }
                              if (minutes > 0 || timeStr === "") {
                                if (timeStr) timeStr += ", ";
                                timeStr += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
                              }
                              return timeStr + (data.ticket_status === "D" ? " (waiting confirmation)" : "");
                            }
                          }
                          return "N/A";
                        }

                        const duration = moment.duration(totalMs);
                        const days = Math.floor(duration.asDays());
                        const hours = duration.hours();
                        const minutes = duration.minutes();

                        let timeStr = "";
                        if (days > 0) {
                          timeStr += `${days} day${days > 1 ? "s" : ""}`;
                        }
                        if (hours > 0) {
                          if (timeStr) timeStr += ", ";
                          timeStr += `${hours} hour${hours !== 1 ? "s" : ""}`;
                        }
                        if (minutes > 0 || timeStr === "") {
                          if (timeStr) timeStr += ", ";
                          timeStr += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
                        }

                        // Add status indicator
                        if (data.ticket_status === "P") {
                          timeStr += " (in progress)";
                        } else if (data.ticket_status === "D") {
                          timeStr += " (waiting confirmation)";
                        }

                        return timeStr;
                      })()}
                    </b>
                  </li>
                  <li className="py-2 fs-5">
                    Updated At:{" "}
                    <b>
                      {moment(data.updatedAt)
                        .month(1)
                        .format("DD-MM-YYYY HH:mm")}
                    </b>
                  </li>
                </ul>
                <ul>
                  <li className="py-2 fs-5">
                    Priority:{" "}
                    <b className={`text-${priorityVariant}`}>{priority}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Ticket Status:{" "}
                    <b className={`text-${statusVariant}`}>{statusText}</b>
                  </li>
                  <li className="py-2 fs-5">
                    User Process:{" "}
                    <b className="text-success">{data.user_process}</b>
                    {level === "admin" || level === "manager" || level === "head" ? (
                      <>
                        <br />
                        <Form.Group className="mb-3">
                          <Form.Select
                            onChange={(e) =>
                              handleChangeUserProcess(e, data.id || data._id)
                            }
                          >
                            <option defaultValue>Choose user process</option>
                            {teams.map((team) => {
                              return (
                                <option key={team.id} value={team.full_name}>
                                  {team.full_name}
                                </option>
                              );
                            })}
                          </Form.Select>
                        </Form.Group>
                      </>
                    ) : null}
                  </li>
                  <li className="py-2 fs-5">
                    Subject Request: <b>{subjectRequest}</b>
                  </li>
                  <li className="py-2 fs-5">
                    Image Request:{" "}
                    <a
                      href={fileObj.image}
                      className="btn btn-info btn-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "13px" }}
                    >
                      <b>View Image</b>
                    </a>
                  </li>
                  <li className="py-2 fs-5">
                    File Doc Request:{" "}
                    <a
                      href={fileObj.file_document}
                      className="btn btn-info btn-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "13px" }}
                    >
                      <b>View File</b>
                    </a>
                  </li>
                </ul>
              </div>
              {level === "support_engineer" || level === "team" ? (
                <>
                  {data.ticket_status === "D" ? null : (
                    <Button
                      variant="success"
                      size="lg"
                      onClick={() => {
                        return (
                          window.confirm("Are you sure the request is done?") &&
                          handleDoneRequest(data.id || data._id)
                        );
                      }}
                    >
                      Request Done
                    </Button>
                  )}
                  <Button
                    variant="primary ms-3"
                    size="lg"
                    onClick={() =>
                      history.push(`${Routes.UserRequestTeam.path}`)
                    }
                  >
                    Back
                  </Button>
                </>
              ) : null}

              {level === "admin" || level === "manager" || level === "head" ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => history.push(`${Routes.UserRequests.path}`)}
                >
                  Back
                </Button>
              ) : null}

              {level === "user" ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() =>
                    history.push(`${Routes.ListUserRequests.path}`)
                  }
                >
                  Back
                </Button>
              ) : null}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
