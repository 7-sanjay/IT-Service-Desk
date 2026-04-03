import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faEllipsisH,
  faEye,
  faTrashAlt,
  faCheckCircle,
  faEdit,
  faSearch,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import moment from "moment-timezone";
import {
  Breadcrumb,
  Card,
  Table,
  Dropdown,
  ButtonGroup,
  Button,
  // Modal,
  // Form,
  Pagination,
  Nav,
  Row,
  Col,
  Form,
  Spinner,
} from "@themesberg/react-bootstrap";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getAllRequestWithUserProccess,
  rejectRequestTeam,
  approveRequestTeam,
  requestDone,
  searchRequest,
  escalateRequest,
} from "../../api/requestApi";
import { Routes } from "../../routes";
import { businessMsBetweenIst, formatMsShort, isWithinBusinessHoursIst } from "../../utils/slaTime";

export default () => {
  const [listRequest, setListRequest] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const history = useHistory();

  const getSlaTimer = (request, kind) => {
    const now = new Date();
    const inBusiness = isWithinBusinessHoursIst(now);
    const pauseReason = request?.sla_pause?.reason;
    const pausedByChat = pauseReason === "waiting_for_user";

    if (kind === "response") {
      const targetMs = request?.response_target_ms;
      const completedAt = request?.respondedAt;
      const dueAt = request?.responseDueAt;
      if (!targetMs && !dueAt) return { text: "-", color: "secondary" };
      if (completedAt) return { text: "Completed", color: "success" };
      if (targetMs && request.createdAt) {
        const elapsed = businessMsBetweenIst(request.createdAt, now);
        const remaining = targetMs - elapsed;
        if (remaining <= 0) return { text: `Breached by ${formatMsShort(-remaining)}`, color: "danger" };
        if (!inBusiness) return { text: `Paused (${formatMsShort(remaining)} left)`, color: "secondary" };
        if (Math.floor(remaining / 60000) <= 30) return { text: `${formatMsShort(remaining)} left`, color: "warning" };
        return { text: `${formatMsShort(remaining)} left`, color: "success" };
      }
      // Fallback: old behaviour using dueAt (wall-clock)
      const diffMs = new Date(dueAt).getTime() - now.getTime();
      const totalMin = Math.floor(Math.abs(diffMs) / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (diffMs < 0) return { text: `Breached by ${h}h ${m}m`, color: "danger" };
      if (!inBusiness) return { text: `Paused (${h}h ${m}m left)`, color: "secondary" };
      if (totalMin <= 30) return { text: `${h}h ${m}m left`, color: "warning" };
      return { text: `${h}h ${m}m left`, color: "success" };
    }

    // resolution
    const targetMs = request?.resolution_target_ms;
    const completedAt = request?.resolvedAt;
    const dueAt = request?.resolutionDueAt;
    if (!targetMs && !dueAt) return { text: "-", color: "secondary" };
    if (completedAt) return { text: "Completed", color: "success" };

    if (targetMs) {
      const accumulated = request?.accumulated_time_ms || 0;
      const running =
        request?.ticket_status === "P" && request?.start_process_ticket && !pausedByChat;
      const current = running
        ? businessMsBetweenIst(request.start_process_ticket, now)
        : 0;
      const elapsed = accumulated + current;
      const remaining = targetMs - elapsed;

      const isPaused = pausedByChat || !inBusiness || !running;
      if (remaining <= 0) return { text: `Breached by ${formatMsShort(-remaining)}`, color: "danger" };
      if (isPaused) return { text: `Paused (${formatMsShort(remaining)} left)`, color: "secondary" };
      if (Math.floor(remaining / 60000) <= 30) return { text: `${formatMsShort(remaining)} left`, color: "warning" };
      return { text: `${formatMsShort(remaining)} left`, color: "success" };
    }

    // Fallback for legacy tickets: dueAt-based, wall-clock
    const diffMs = new Date(dueAt).getTime() - now.getTime();
    const totalMin = Math.floor(Math.abs(diffMs) / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (diffMs < 0) return { text: `Breached by ${h}h ${m}m`, color: "danger" };
    if (!inBusiness) return { text: `Paused (${h}h ${m}m left)`, color: "secondary" };
    if (totalMin <= 30) return { text: `${h}h ${m}m left`, color: "warning" };
    return { text: `${h}h ${m}m left`, color: "success" };
  };

  useEffect(() => {
    (async () => {
      try {
        const getRequest = await getAllRequestWithUserProccess();
        setListRequest(getRequest.data.data.requests);
        setTotalPage(getRequest.data.data.totalPages);
      } catch (error) {
        toast.warning("Unauthorized Access!!!");
        history.push("/");
        localStorage.clear();
        console.log(error);
      }
    })();
  }, [history]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsPending(true);
    const search = await searchRequest(keyword);
    setListRequest(search.data.data);
    setKeyword("");
    setIsPending(false);
  };

  const previousPage = async () => {
    setCurrentPage((current) => current - 1);
    if (currentPage <= 1) {
      setCurrentPage(1);
    }
    const getRequest = await getAllRequestWithUserProccess({
      page: currentPage,
      size: 10,
    });
    setListRequest(getRequest.data.data.requests);
  };

  const nextPage = async () => {
    setCurrentPage((current) => current + 1);
    if (currentPage >= totalPage) {
      setCurrentPage(1);
    }
    const getRequest = await getAllRequestWithUserProccess({
      page: currentPage,
      size: 10,
    });
    setListRequest(getRequest.data.data.requests);
  };

  const handleDoneRequest = async (id) => {
    try {
      await requestDone(id);

      listRequest.map((item) => {
        if (item.id === id) {
          item.ticket_status = "D";
        }
        return item;
      });
      toast.success("Successfully request done!");
      history.push(Routes.UserRequestTeam.path);
    } catch (error) {
      toast.error("Something went wrong!");
      console.log(error);
    }
  };

  const handleApprove = async (id) => {
    const approveRequest = await approveRequestTeam(
      id,
      localStorage.getItem("fullname")
    );
    if (!approveRequest) {
      return toast.error("Something went wrong!");
    }
    listRequest.map((item) => {
      if (item.id === id) {
        item.ticket_status = "P";
        item.user_process = localStorage.getItem("fullname");
      }
      return item;
    });
    history.push(Routes.UserRequestTeam.path);
    toast.success("Successfully approve request!");
  };

  const handleReject = async (id) => {
    const rejectRequest = await rejectRequestTeam(id);
    if (!rejectRequest) {
      return toast.error("Something went wrong!");
    }
    listRequest.map((item) => {
      if (item.id === id) {
        item.ticket_status = "R";
      }
      return item;
    });
    history.push(Routes.UserRequestTeam.path);
    toast.success("Successfully reject request!");
  };

  const handleEscalate = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to escalate? This will notify the manager."
      )
    ) {
      return;
    }
    try {
      await escalateRequest(id);
      listRequest.map((item) => {
        if (item.id === id) {
          item.ticket_status = "E";
        }
        return item;
      });
      toast.success("Ticket escalated to manager successfully!");
      history.push(Routes.UserRequestTeam.path);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to escalate ticket!");
      console.log(error);
    }
  };

  const requestLists = listRequest.map((request) => {
    let statusVariant = "";
    let statusText = "";

    if (request.ticket_status === "W") {
      statusVariant = "warning";
      statusText = "Waiting";
    } else if (request.ticket_status === "P") {
      statusVariant = "info";
      statusText = "ON Progress";
    } else if (request.ticket_status === "D") {
      statusVariant = "warning";
      statusText = "Done (Waiting User)";
    } else if (request.ticket_status === "C") {
      statusVariant = "success";
      statusText = "Closed";
    } else if (request.ticket_status === "E") {
      statusVariant = "info";
      statusText = "Escalated";
    } else {
      statusVariant = "danger";
      statusText = "Rejected";
    }

    const priority = request.priority === "Critical" ? "High" : (request.priority || "Medium");
    let priorityVariant = "secondary";
    if (priority === "High") {
      priorityVariant = "warning";
    } else if (priority === "Medium") {
      priorityVariant = "info";
    } else if (priority === "Low") {
      priorityVariant = "success";
    }

    const changeDate = moment(request.createdAt)
      .month(1)
      .format("DD-MM-YYYY HH:mm");

    const requestDetail =
      request.requests_detail || request.detail || { title_request: "" };
    const responseTimer = getSlaTimer(request, "response");
    const resolutionTimer = getSlaTimer(request, "resolution");

    return (
      <>
        <tr key={request.id || request._id}>
          <td>{request.id || request._id}</td>
          <td>
            <span className="fw-normal">{request.user_request}</span>
          </td>
          <td>
            <span className="fw-normal">{changeDate}</span>
          </td>
          <td>
            <span className="fw-normal">
              {requestDetail.title_request}
            </span>
          </td>
          <td>
            <span className="fw-normal">{request.user_process}</span>
          </td>
          <td>
            <span className={`fw-normal text-${priorityVariant}`}>
              {priority}
            </span>
          </td>
          <td>
            <span className={`fw-normal text-${statusVariant}`}>
              {statusText}
            </span>
          </td>
          <td>
            <span className={`fw-normal text-${responseTimer.color}`}>{responseTimer.text}</span>
          </td>
          <td>
            <span className={`fw-normal text-${resolutionTimer.color}`}>{resolutionTimer.text}</span>
          </td>
          <td>
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle
                as={Button}
                split
                variant="link"
                className="text-dark m-0 p-0"
              >
                <span className="icon icon-sm">
                  <FontAwesomeIcon icon={faEllipsisH} className="icon-dark" />
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-20">
                <Dropdown.Item
                  onClick={() => {
                    history.push(
                      `/ticketing/detail-request/${request.id || request._id}`
                    );
                  }}
                >
                  <FontAwesomeIcon icon={faEye} className="me-2" /> Details
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    history.push(
                      `/ticketing/request/chat/${request.id || request._id}/status/${request.ticket_status}`
                    );
                  }}
                >
                  <FontAwesomeIcon icon={faComments} className="me-2" /> Chat
                </Dropdown.Item>

                {request.ticket_status === "P" ? (
                  <>
                    <Dropdown.Item
                      className="text-success fw-bold"
                      onClick={() => {
                        handleDoneRequest(request.id || request._id);
                      }}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />{" "}
                      Mark as Done
                    </Dropdown.Item>
                    <Dropdown.Item
                      className="text-primary fw-bold"
                      onClick={() => {
                        handleEscalate(request.id || request._id);
                      }}
                    >
                      <FontAwesomeIcon icon={faEllipsisH} className="me-2" />{" "}
                      Escalate to Manager
                    </Dropdown.Item>
                  </>
                ) : null}

                {request.ticket_status === "W" ? (
                  <Dropdown.Item
                    onClick={() => {
                      // setShowDefaultModalReply(true);
                      // setIdDetailReq(request.requests_detail.id);
                      handleApprove(request.id || request._id);
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} className="me-2" /> Approve
                  </Dropdown.Item>
                ) : null}

                {request.ticket_status === "D" || request.ticket_status === "C" ? (
                  ""
                ) : (
                  <Dropdown.Item
                    className="text-danger"
                    onClick={() => {
                      handleReject(request.id || request._id);
                      // setShowDefaultModalReply(true);
                      // setIdDetailReq(request.requests_detail.id);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="me-2" />{" "}
                    Reject
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </td>
        </tr>
      </>
    );
  });

  return (
    <>
      <div className="d-xl-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-xl-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item>
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>User Requests</Breadcrumb.Item>
            <Breadcrumb.Item active>List Requests</Breadcrumb.Item>
          </Breadcrumb>
          <h4>List Requests</h4>
        </div>
      </div>

      <Row className="wrapper justify-between">
        <Col>
          <Button
            variant="primary"
            size="sm"
            className="mb-3"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </Col>

        <Col>
          <Form
            onSubmit={(e) => handleSearch(e)}
            style={{
              display: "flex",
              justifyContent: "between",
              alignItems: "center",
            }}
          >
            <Form.Control
              type="text"
              placeholder="Search..."
              onChange={(e) => setKeyword(e.target.value)}
              value={keyword}
              style={{ marginRight: "10px" }}
            />

            {isPending ? (
              <Button variant="primary" type="submit" disabled>
                <Spinner animation="border" size="sm" role="status" />
              </Button>
            ) : (
              <Button variant="primary" type="submit">
                <FontAwesomeIcon icon={faSearch} />
              </Button>
            )}
          </Form>
        </Col>
      </Row>

      <Card
        border="light"
        className="table-wrapper table-responsive shadow-sm w-100"
      >
        <Card.Body className="pt-0">
          <Table hover className="user-table align-items-center">
            <thead>
              <tr>
                <th className="border-bottom">ID Request</th>
                <th className="border-bottom">User request</th>
                <th className="border-bottom">Date request</th>
                <th className="border-bottom">Title request</th>
                <th className="border-bottom">User process</th>
                <th className="border-bottom">Priority</th>
                <th className="border-bottom">Status request</th>
                <th className="border-bottom">Response SLA</th>
                <th className="border-bottom">Resolution SLA</th>
                <th className="border-bottom">Action</th>
              </tr>
            </thead>
            <tbody>{requestLists}</tbody>
          </Table>
          <Card.Footer className="px-3 border-0 d-lg-flex align-items-center justify-content-between">
            <Nav>
              <Pagination className="mb-2 mb-lg-0">
                <Button
                  className="me-3"
                  variant="primary"
                  onClick={() => previousPage()}
                >
                  Previous
                </Button>
                <Button variant="primary" onClick={() => nextPage()}>
                  Next
                </Button>
              </Pagination>
            </Nav>
          </Card.Footer>
        </Card.Body>
      </Card>
    </>
  );
};
