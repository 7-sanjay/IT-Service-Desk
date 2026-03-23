import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faRobot,
  faComments,
  faEye,
  faFilePdf,
  faEllipsisH,
  faCheckCircle,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import moment from "moment-timezone";
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  Dropdown,
  ButtonGroup,
  Form,
  Pagination,
  Nav,
  Row,
  Col,
  Spinner,
  Modal,
} from "@themesberg/react-bootstrap";
import { toast } from "react-toastify";

import { getAllUserRequest, searchRequest, getRequestAiHelp, resolveRequestByUser, reopenTicket } from "../../api/requestApi";
import { useHistory } from "react-router-dom";

export default () => {
  const [listRequest, setListRequest] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiHelpRequestId, setAiHelpRequestId] = useState(null);
  const [aiHelpLoading, setAiHelpLoading] = useState(false);
  const [aiHelpContent, setAiHelpContent] = useState("");
  const [aiHelpError, setAiHelpError] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const history = useHistory();
  const level = localStorage.getItem("level");
  const isUserRole = level === "user";
  let statusVariant = "";
  let statusText = "";

  useEffect(() => {
    (async () => {
      const getRequest = await getAllUserRequest();
      setListRequest(getRequest.data.data.requests);
      setTotalPage(getRequest.data.data.totalPages);
    })();
  }, []);

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
    const getRequest = await getAllUserRequest({ page: currentPage, size: 10 });
    setListRequest(getRequest.data.data.requests);
  };

  const nextPage = async () => {
    setCurrentPage((current) => current + 1);
    if (currentPage >= totalPage) {
      setCurrentPage(1);
    }
    const getRequest = await getAllUserRequest({ page: currentPage, size: 10 });
    setListRequest(getRequest.data.data.requests);
  };

  const handleAiHelp = async (requestId) => {
    setShowAiModal(true);
    setAiHelpRequestId(requestId);
    setAiHelpLoading(true);
    setAiHelpContent("");
    setAiHelpError("");
    try {
      const res = await getRequestAiHelp(requestId);
      if (res.data.status === "success" && res.data.data?.troubleshooting) {
        setAiHelpContent(res.data.data.troubleshooting);
      } else {
        setAiHelpError("No troubleshooting steps returned.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load AI help.";
      setAiHelpError(msg);
      toast.error(msg);
    } finally {
      setAiHelpLoading(false);
    }
  };

  const handleProblemSolved = async (solved, requestId = null, viaAi = false) => {
    const ticketId = requestId || aiHelpRequestId;
    if (!solved || !ticketId) {
      setShowAiModal(false);
      setAiHelpRequestId(null);
      setAiHelpContent("");
      return;
    }
    setResolveLoading(true);
    try {
      await resolveRequestByUser(ticketId, { viaAi });
      toast.success("Ticket closed successfully.");
      setShowAiModal(false);
      setAiHelpRequestId(null);
      setAiHelpContent("");
      const getRequest = await getAllUserRequest();
      setListRequest(getRequest.data.data.requests);
      setTotalPage(getRequest.data.data.totalPages);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to close ticket.";
      toast.error(msg);
    } finally {
      setResolveLoading(false);
    }
  };

  const handleConfirmDone = async (requestId) => {
    if (window.confirm("Is the issue solved? Click OK to close the ticket.")) {
      await handleProblemSolved(true, requestId, false);
    }
  };

  const handleReopenTicket = async (requestId) => {
    if (window.confirm("The issue is not solved? Click OK to reopen the ticket for the team.")) {
      try {
        await reopenTicket(requestId);
        toast.success("Ticket reopened successfully.");
        const getRequest = await getAllUserRequest();
        setListRequest(getRequest.data.data.requests);
        setTotalPage(getRequest.data.data.totalPages);
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to reopen ticket.";
        toast.error(msg);
      }
    }
  };

  const handleCloseAiModal = () => {
    setShowAiModal(false);
    setAiHelpRequestId(null);
    setAiHelpContent("");
    setAiHelpError("");
  };

  const requestLists = listRequest.map((request) => {
    if (request.ticket_status === "W") {
      statusVariant = "warning";
      statusText = "Waiting";
    } else if (request.ticket_status === "P") {
      statusVariant = "info";
      statusText = "ON Progress";
    } else if (request.ticket_status === "D") {
      statusVariant = "warning";
      statusText = "Done - Confirm";
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
      request.requests_detail || request.detail || { title_request: "", subject_request: "" };
    const subjectRequest = requestDetail.subject_request ?? requestDetail.subjek_request ?? "";

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
          {!isUserRole && (
            <td>
              <span className="fw-normal">{request.user_process}</span>
            </td>
          )}
          {!isUserRole && (
            <td>
              <span className={`fw-normal text-${priorityVariant}`}>
                {priority}
              </span>
            </td>
          )}
          <td>
            <span className={`fw-normal text-${statusVariant}`}>
              {statusText}
            </span>
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
                  onClick={() =>
                    history.push(
                      `/ticketing/detail-request/${request.id || request._id}`
                    )
                  }
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon
                    icon={faEye}
                    className="me-2"
                    style={{ lineHeight: 1 }}
                  />
                  <span className="fw-bold">Detail</span>
                </Dropdown.Item>

                <Dropdown.Item
                  onClick={() =>
                    history.push(
                      `/ticketing/request/chat/${request.id || request._id}/status/${request.ticket_status}`
                    )
                  }
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon
                    icon={faComments}
                    className="me-2"
                    style={{ lineHeight: 1 }}
                  />
                  <span className="fw-bold">Chat</span>
                </Dropdown.Item>

                <Dropdown.Item
                  onClick={() =>
                    window.open(
                      `/#/ticketing/render?id=${request.id || request._id}`,
                      "_blank"
                    )
                  }
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="me-2"
                    style={{ lineHeight: 1 }}
                  />
                  <span className="fw-bold">PDF</span>
                </Dropdown.Item>

                {isUserRole && (
                  <>
                    <Dropdown.Item
                      onClick={() => handleAiHelp(request.id || request._id)}
                      title="Get AI troubleshooting steps"
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon
                        icon={faRobot}
                        className="me-2"
                        style={{ lineHeight: 1 }}
                      />
                      <span className="fw-bold">AI Help</span>
                    </Dropdown.Item>

                    {request.ticket_status === "D" && (
                      <>
                        <Dropdown.Item
                          onClick={() => handleConfirmDone(request.id || request._id)}
                          disabled={resolveLoading}
                          title="Confirm issue is solved and close ticket"
                          className="d-flex align-items-center"
                        >
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-2"
                            style={{ lineHeight: 1 }}
                          />
                          <span className="fw-bold">
                            {resolveLoading ? "Closing..." : "Confirm Solved"}
                          </span>
                        </Dropdown.Item>

                        <Dropdown.Item
                          onClick={() => handleReopenTicket(request.id || request._id)}
                          disabled={resolveLoading}
                          title="Issue not solved - reopen ticket"
                          className="d-flex align-items-center"
                        >
                          <FontAwesomeIcon
                            icon={faExclamationCircle}
                            className="me-2"
                            style={{ lineHeight: 1 }}
                          />
                          <span className="fw-bold">Issue Not Solved</span>
                        </Dropdown.Item>
                      </>
                    )}
                  </>
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
      {/* <Button
        className="btn btn-primary"
        onClick={() => console.log(singelRequest)}
      >
        TEST
      </Button> */}
      <div className="d-xl-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-xl-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item>
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Tables</Breadcrumb.Item>
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

      <Card border="light" className="table-wrapper table-responsive shadow-sm">
        <Card.Body className="pt-0">
          <Table hover className="user-table align-items-center">
            <thead>
              <tr>
                <th className="border-bottom">ID Request</th>
                <th className="border-bottom">User request</th>
                <th className="border-bottom">Date request</th>
                <th className="border-bottom">Title request</th>
                {!isUserRole && <th className="border-bottom">User process</th>}
                {!isUserRole && <th className="border-bottom">Priority</th>}
                <th className="border-bottom">Status request</th>
                <th className="border-bottom">Action</th>
              </tr>
            </thead>
            <tbody>{requestLists}</tbody>
          </Table>
          <Card.Footer className="px-1 border-0 d-lg-flex align-items-center justify-content-between">
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

      <Modal
        show={showAiModal}
        onHide={handleCloseAiModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faRobot} className="me-2" />
            AI Troubleshooting Steps
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {aiHelpLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2 mb-0">Analyzing your request...</p>
            </div>
          )}
          {!aiHelpLoading && aiHelpError && (
            <p className="text-danger mb-0">{aiHelpError}</p>
          )}
          {!aiHelpLoading && aiHelpContent && (
            <>
              <div
                className="text-start"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {aiHelpContent}
              </div>
              {isUserRole && (
                <p className="mt-3 mb-0 fw-semibold">Was the problem solved?</p>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!aiHelpLoading && aiHelpContent && isUserRole ? (
            <>
              <Button
                variant="success"
                onClick={() => handleProblemSolved(true, null, true)}
                disabled={resolveLoading}
              >
                {resolveLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Closing...
                  </>
                ) : (
                  "Yes, close ticket"
                )}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => handleProblemSolved(false)}
                disabled={resolveLoading}
              >
                No
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={handleCloseAiModal}>
              Close
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};
