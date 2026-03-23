import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faChevronDown,
  faChevronUp,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import moment from "moment-timezone";
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  Row,
  Col,
  Badge,
  Spinner,
} from "@themesberg/react-bootstrap";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";

import { getRequestsByPriority } from "../../api/requestApi";

export default () => {
  const [prioritiesData, setPrioritiesData] = useState([]);
  const [expandedPriorities, setExpandedPriorities] = useState({});
  const [loading, setLoading] = useState(false);
  const history = useHistory();

  useEffect(() => {
    fetchRequestsByPriority();
  }, []);

  const fetchRequestsByPriority = async () => {
    try {
      setLoading(true);
      const response = await getRequestsByPriority();
      
      console.log("[RequestsByPriority] Full response:", response);
      console.log("[RequestsByPriority] Response data:", response?.data);
      console.log("[RequestsByPriority] Priorities data:", response?.data?.data);
      
      // Check if response and data exist
      if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        console.log(`[RequestsByPriority] Found ${response.data.data.length} priority groups`);
        console.log(`[RequestsByPriority] Total tickets:`, response.data.data.reduce((sum, p) => sum + (p.count || 0), 0));
        
        setPrioritiesData(response.data.data);
        // Expand first priority by default
        if (response.data.data.length > 0 && response.data.data[0]?.priority) {
          setExpandedPriorities({
            [response.data.data[0].priority]: true,
          });
        }
      } else {
        console.warn("[RequestsByPriority] Invalid response structure:", response);
        setPrioritiesData([]);
        toast.warning("No data available");
      }
    } catch (error) {
      console.error("[RequestsByPriority] Error fetching requests by priority:", error);
      console.error("[RequestsByPriority] Error details:", error.response?.data || error.message);
      toast.error("Failed to load requests by priority!");
      setPrioritiesData([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePriority = (priority) => {
    setExpandedPriorities((prev) => ({
      ...prev,
      [priority]: !prev[priority],
    }));
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

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case "High":
        return "warning";
      case "Medium":
        return "info";
      case "Low":
        return "success";
      default:
        return "secondary";
    }
  };

  const renderRequestRow = (request) => {
    if (!request) return null;
    
    const statusInfo = getStatusInfo(request.ticket_status);
    const priority =
      request.priority === "Critical" ? "High" : (request.priority || "Medium");
    const priorityVariant = getPriorityVariant(priority);
    const changeDate = request.createdAt 
      ? moment(request.createdAt).format("DD-MM-YYYY HH:mm")
      : "-";
    const requestDetail =
      request.requests_detail || request.detail || { title_request: "" };

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
          <span className="fw-normal">{requestDetail.title_request}</span>
        </td>
        <td>
          <span className="fw-normal">{request.user_process || "-"}</span>
        </td>
        <td>
          <Badge bg={priorityVariant} className="text-white">
            {priority}
          </Badge>
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
            <FontAwesomeIcon icon={faEye} className="me-1" />
            View
          </Button>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

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
            <Breadcrumb.Item>Requests</Breadcrumb.Item>
            <Breadcrumb.Item active>Priority</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Priority</h4>
        </div>
      </div>

      <Row className="mb-3">
        <Col>
          <Button
            variant="primary"
            size="sm"
            onClick={fetchRequestsByPriority}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      {!prioritiesData || prioritiesData.length === 0 ? (
        <Card border="light" className="shadow-sm">
          <Card.Body className="text-center py-5">
            <p className="text-muted">No requests found.</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {prioritiesData.map((priorityData) => {
            // Ensure priorityData and its properties exist
            if (!priorityData || !priorityData.priority) return null;
            
            const requests = priorityData.requests || [];
            const count = priorityData.count || requests.length || 0;
            const priorityVariant = getPriorityVariant(priorityData.priority);
            
            return (
              <Card
                key={priorityData.priority}
                border="light"
                className="shadow-sm mb-3"
              >
                <Card.Header
                  style={{ cursor: "pointer" }}
                  onClick={() => togglePriority(priorityData.priority)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center">
                    <Badge bg={priorityVariant} className="me-3 text-white" style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}>
                      {priorityData.priority}
                    </Badge>
                    <Badge bg="primary" pill>
                      {count} ticket{count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <FontAwesomeIcon
                    icon={
                      expandedPriorities[priorityData.priority]
                        ? faChevronUp
                        : faChevronDown
                    }
                  />
                </Card.Header>
                {expandedPriorities[priorityData.priority] && (
                  <Card.Body className="pt-0">
                    {requests.length === 0 ? (
                      <p className="text-muted text-center py-3">No requests with this priority.</p>
                    ) : (
                      <Table hover className="user-table align-items-center">
                        <thead>
                          <tr>
                            <th className="border-bottom">ID Request</th>
                            <th className="border-bottom">User Request</th>
                            <th className="border-bottom">Date Request</th>
                            <th className="border-bottom">Title Request</th>
                            <th className="border-bottom">User Process</th>
                            <th className="border-bottom">Priority</th>
                            <th className="border-bottom">Status</th>
                            <th className="border-bottom">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map((request) =>
                            request ? renderRequestRow(request) : null
                          )}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                )}
              </Card>
            );
          })}
        </>
      )}
    </>
  );
};
