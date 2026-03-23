import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faEllipsisH,
  faEye,
  faTrashAlt,
  faSearch,
  faUserFriends,
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
  Pagination,
  Nav,
  Row,
  Col,
  Form,
  Spinner,
  Modal,
} from "@themesberg/react-bootstrap";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { Routes } from "../../routes";

import {
  getAllRequestHead,
  rejectRequestAdmin,
  searchRequest,
  reassignRequest,
} from "../../api/requestApi";
import { getAllUserTeam } from "../../api/userApi";

export default () => {
  const [listRequest, setListRequest] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState("");
  const [teams, setTeams] = useState([]);
  const [reassignLoading, setReassignLoading] = useState(false);
  const history = useHistory();

  useEffect(() => {
    (async () => {
      try {
        const getRequest = await getAllRequestHead();
        setListRequest(getRequest.data.data.requests);
        setTotalPage(getRequest.data.data.totalPages);
        const getTeams = await getAllUserTeam();
        setTeams(getTeams.data.data || []);
      } catch (error) {
        console.log("Error data fetching");
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

  const handleReject = async (id) => {
    const rejectRequest = await rejectRequestAdmin(id);
    if (!rejectRequest) {
      return toast.error("Something went wrong!");
    }
    listRequest.map((item) => {
      if (item.id === id) {
        item.ticket_status = "R";
      }
      return item;
    });
    history.push(Routes.UserRequests.path);
    toast.success("Successfully reject request!");
  };

  const handleOpenReassignModal = (ticketId) => {
    setSelectedTicketId(ticketId);
    setShowReassignModal(true);
    setSelectedTeamMember("");
  };

  const handleReassign = async () => {
    if (!selectedTeamMember) {
      toast.error("Please select a team member");
      return;
    }
    setReassignLoading(true);
    try {
      await reassignRequest(selectedTicketId, selectedTeamMember);
      listRequest.map((item) => {
        if (item.id === selectedTicketId) {
          item.ticket_status = "P";
          item.user_process = selectedTeamMember;
        }
        return item;
      });
      toast.success("Ticket reassigned successfully!");
      setShowReassignModal(false);
      setSelectedTicketId(null);
      setSelectedTeamMember("");
      history.push(Routes.UserRequests.path);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reassign ticket!");
      console.log(error);
    } finally {
      setReassignLoading(false);
    }
  };

  const previousPage = async () => {
    setCurrentPage((current) => current - 1);
    if (currentPage <= 1) {
      setCurrentPage(1);
    }
    const getRequest = await getAllRequestHead({ page: currentPage, size: 10 });
    setListRequest(getRequest.data.data.requests);
  };

  const nextPage = async () => {
    setCurrentPage((current) => current + 1);
    if (currentPage >= totalPage) {
      setCurrentPage(1);
    }
    const getRequest = await getAllRequestHead({ page: currentPage, size: 10 });
    setListRequest(getRequest.data.data.requests);
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

                {request.ticket_status === "E" && (
                  <Dropdown.Item
                    onClick={() => handleOpenReassignModal(request.id || request._id)}
                  >
                    <FontAwesomeIcon icon={faUserFriends} className="me-2" />{" "}
                    Reassign to Team
                  </Dropdown.Item>
                )}
                {request.ticket_status !== "C" && request.ticket_status !== "D" && (
                  <Dropdown.Item
                    className="text-danger"
                    onClick={() => handleReject(request.id || request._id)}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="me-2" /> Reject
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

      <Modal
        show={showReassignModal}
        onHide={() => {
          setShowReassignModal(false);
          setSelectedTicketId(null);
          setSelectedTeamMember("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Reassign Ticket</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Team Member</Form.Label>
            <Form.Select
              value={selectedTeamMember}
              onChange={(e) => setSelectedTeamMember(e.target.value)}
            >
              <option value="">Choose a team member...</option>
              {teams.map((team) => (
                <option key={team.id || team._id} value={team.full_name || team.fullname}>
                  {team.full_name || team.fullname} ({team.username || team.email})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowReassignModal(false);
              setSelectedTicketId(null);
              setSelectedTeamMember("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleReassign}
            disabled={reassignLoading || !selectedTeamMember}
          >
            {reassignLoading ? "Reassigning..." : "Reassign"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
