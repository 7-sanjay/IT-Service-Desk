import {
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Table,
  Breadcrumb,
  Badge,
  Spinner,
} from "@themesberg/react-bootstrap";
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import moment from "moment-timezone";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import api from "../../api/index";

export default function ReportRequest() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const history = useHistory();

  const handleFilter = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.warning("Please select both start date and end date");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/request/filter-date", {
        startDate,
        endDate,
      });

      if (response.data.status === "success") {
        // Filter requests where the current user is the user_process (team member)
        const fullname = localStorage.getItem("fullname");
        const filteredRequests = response.data.data.filter(
          (request) => request.user_process === fullname
        );
        setRequests(filteredRequests);
        
        if (filteredRequests.length === 0) {
          toast.info("No requests found for the selected date range");
        } else {
          toast.success(`Found ${filteredRequests.length} request(s)`);
        }
      } else {
        toast.error("Failed to filter requests");
        setRequests([]);
      }
    } catch (error) {
      console.error("Error filtering requests:", error);
      toast.error("Failed to filter requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "W":
        return { variant: "warning", text: "Waiting" };
      case "P":
        return { variant: "info", text: "ON Progress" };
      case "D":
        return { variant: "success", text: "Done" };
      case "R":
        return { variant: "danger", text: "Rejected" };
      default:
        return { variant: "secondary", text: "Unknown" };
    }
  };

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
            <Breadcrumb.Item>Request Report</Breadcrumb.Item>
            <Breadcrumb.Item active>Filter by Date</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Request Report</h4>
        </div>
      </div>

      <Container>
        <Card border="light" className="shadow-sm p-3 mb-3">
          <Form onSubmit={handleFilter}>
            <Row className="align-items-center">
              <Col md={4}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </Col>
              <Col md={4} className="mt-4">
                <Button variant="primary" size="md" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading...
                    </>
                  ) : (
                    "Filter"
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>

        {requests.length > 0 && (
          <Card
            border="light"
            className="table-wrapper table-responsive shadow-sm w-100"
          >
            <Card.Body className="pt-0">
              <Table hover className="user-table align-items-center">
                <thead>
                  <tr>
                    <th className="border-bottom">ID Request</th>
                    <th className="border-bottom">User Request</th>
                    <th className="border-bottom">Date Request</th>
                    <th className="border-bottom">Title Request</th>
                    <th className="border-bottom">User Process</th>
                    <th className="border-bottom">Status Request</th>
                    <th className="border-bottom">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const statusInfo = getStatusInfo(request.ticket_status);
                    const requestDetail =
                      request.requests_detail || request.detail || {
                        title_request: "",
                      };
                    const changeDate = request.createdAt
                      ? moment(request.createdAt).format("DD-MM-YYYY HH:mm")
                      : "-";

                    return (
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
                          <span className="fw-normal">
                            {request.user_process || "-"}
                          </span>
                        </td>
                        <td>
                          <Badge bg={statusInfo.variant} className="text-white">
                            {statusInfo.text}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() =>
                              history.push(
                                `/ticketing/detail-request/${request.id || request._id}`
                              )
                            }
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {requests.length === 0 && !loading && (
          <Card border="light" className="shadow-sm">
            <Card.Body className="text-center py-5">
              <p className="text-muted">
                {startDate && endDate
                  ? "No requests found for the selected date range. Please select dates and click Filter."
                  : "Please select start date and end date, then click Filter to view requests."}
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
}
