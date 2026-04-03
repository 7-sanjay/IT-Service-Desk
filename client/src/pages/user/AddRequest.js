import React, { useState, useRef } from "react";
import {
  Form,
  Button,
  Card,
  Spinner,
  Modal,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

import {
  createTicketDraft,
  getDraftAiHelp,
  promoteTicketDraft,
  dismissTicketDraft,
} from "../../api/requestApi";
import { Routes } from "../../routes";
import { useHistory } from "react-router-dom";

export default () => {
  const [isPending, setIsPending] = useState(false);
  const history = useHistory();
  const [request, setRequest] = useState({
    userRequest: localStorage.getItem("username"),
    department: "",
    email: localStorage.getItem("email"),
    type: "",
    category: "",
    titleRequest: "",
    subjectRequest: "",
    image: "",
    file_document: "",
  });

  const [showAiModal, setShowAiModal] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [aiHelpLoading, setAiHelpLoading] = useState(false);
  const [aiHelpContent, setAiHelpContent] = useState("");
  const [aiHelpError, setAiHelpError] = useState("");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const draftHandledRef = useRef(false);

  const incidentCategories = [
    "Hardware Issue",
    "Software Issue",
    "Network Issue",
    "Email Issue",
    "Access/Login Issue",
    "Server/System Issue",
    "Security Issue",
    "Others",
  ];

  const requestCategories = [
    "Password Reset",
    "Software Installation",
    "New Account Creation",
    "Access Permission Request",
    "New Hardware Request",
    "Email Account Setup",
    "Upgrade Request",
    "General IT Support",
  ];

  const [categories, setCategories] = useState([]);
  let formData = new FormData();

  const handleTypeChange = (e) => {
    const value = e.target.value;
    setRequest({ ...request, type: value, category: "" });

    if (value === "I") {
      setCategories(incidentCategories);
    } else if (value === "P") {
      setCategories(requestCategories);
    } else {
      setCategories([]);
    }
  };

  const resetForm = () => {
    setRequest({
      userRequest: localStorage.getItem("username"),
      department: "",
      email: localStorage.getItem("email"),
      type: "",
      category: "",
      titleRequest: "",
      subjectRequest: "",
      image: "",
      file_document: "",
    });
  };

  const closeAiModalAndCleanup = async () => {
    if (draftId && !draftHandledRef.current) {
      try {
        await dismissTicketDraft(draftId);
      } catch (e) {
        /* ignore */
      }
    }
    setShowAiModal(false);
    setDraftId(null);
    setAiHelpContent("");
    setAiHelpError("");
    setAiHelpLoading(false);
    draftHandledRef.current = false;
  };

  const loadAiHelpForDraft = async (id) => {
    setAiHelpLoading(true);
    setAiHelpContent("");
    setAiHelpError("");
    try {
      const res = await getDraftAiHelp(id);
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
    } finally {
      setAiHelpLoading(false);
    }
  };

  const handleSolvedByAi = async () => {
    if (!draftId) return;
    setPromoteLoading(true);
    try {
      await dismissTicketDraft(draftId);
      draftHandledRef.current = true;
      toast.success("No ticket was sent to the queue. You can open a new request if needed.");
      await closeAiModalAndCleanup();
      resetForm();
      history.push(Routes.ListUserRequests.path);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not dismiss the draft."
      );
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleNotSolvedByAi = async () => {
    if (!draftId) return;
    setPromoteLoading(true);
    try {
      const res = await promoteTicketDraft(draftId);
      draftHandledRef.current = true;
      const newId = res.data?.data?.id;
      toast.success(
        res.data?.message || "Ticket submitted to the support queue."
      );
      setShowAiModal(false);
      setDraftId(null);
      setAiHelpContent("");
      setAiHelpError("");
      resetForm();
      history.push(Routes.ListUserRequests.path);

      const pdfUrl = newId
        ? `/#/ticketing/render?id=${newId}`
        : `/#/ticketing/render?user=${request.userRequest}&department=${request.department}&type=${request.type}&category=${request.category}&title=${request.titleRequest}&subject=${request.subjectRequest}`;
      window.open(pdfUrl, "_blank");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit ticket to support."
      );
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    draftHandledRef.current = false;

    formData = new FormData();
    formData.append("userRequest", request.userRequest);
    formData.append("department", request.department);
    formData.append("email", request.email);
    formData.append("type", request.type);
    formData.append("category", request.category);
    formData.append("titleRequest", request.titleRequest);
    formData.append("subjectRequest", request.subjectRequest);
    if (request.image) formData.append("image", request.image);
    if (request.file_document) formData.append("file_document", request.file_document);

    try {
      const sent = await createTicketDraft(formData);
      if (sent.data?.status !== "success" || !sent.data?.data?.id) {
        toast.error(
          sent.data?.message || "Could not save draft. Please try again."
        );
        setIsPending(false);
        return;
      }

      const id = sent.data.data.id;
      setDraftId(id);
      setShowAiModal(true);
      await loadAiHelpForDraft(id);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Oops! Something went wrong. Please try again later."
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mt-3">
      <Card border="light" className="shadow-sm p-3" style={{ width: "70%" }}>
        <h4>Add Requests</h4>
        <Form onSubmit={(e) => handleSubmit(e)}>
          <Form.Group className="mb-3" controlId="user">
            <Form.Label>User request</Form.Label>
            <Form.Control
              type="text"
              disabled
              placeholder="Enter username"
              value={localStorage.getItem("username")}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Department</Form.Label>
            <Form.Select
              required
              onChange={(e) =>
                setRequest({ ...request, department: e.target.value })
              }
            >
              <option defaultValue>Open this select menu</option>
              <option value="IT">IT</option>
              <option value="Human Resources (HR)">Human Resources (HR)</option>
              <option value="Finance">Finance</option>
              <option value="Sales">Sales</option>
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="formBasicEmail" className="mb-3">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              type="text"
              disabled
              placeholder="Enter email"
              value={localStorage.getItem("email")}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Type</Form.Label>
            <Form.Select required value={request.type} onChange={handleTypeChange}>
              <option value="">Open this select menu</option>
              <option value="I">Incident</option>
              <option value="P">Request</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Category</Form.Label>
            <Form.Select
              required
              value={request.category}
              onChange={(e) =>
                setRequest({ ...request, category: e.target.value })
              }
            >
              <option value="">Open this select menu</option>
              {categories.map((ctg) => {
                return (
                  <option key={ctg} value={ctg}>
                    {ctg}
                  </option>
                );
              })}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="titleRequest" className="mb-3">
            <Form.Label>Request title</Form.Label>
            <Form.Control
              type="text"
              id="titleRequest"
              required
              placeholder="Enter request title"
              onChange={(e) =>
                setRequest({ ...request, titleRequest: e.target.value })
              }
            />
          </Form.Group>

          <Form.Group controlId="subjectRequest" className="mb-3">
            <Form.Label>Request subject</Form.Label>
            <Form.Control
              as="textarea"
              rows="5"
              id="subjectRequest"
              required
              placeholder="Enter request subject or description"
              onChange={(e) =>
                setRequest({ ...request, subjectRequest: e.target.value })
              }
            />
          </Form.Group>

          <Form.Group controlId="image" className="mb-3">
            <Form.Label>Image</Form.Label>
            <Form.Control
              type="file"
              id="image"
              placeholder="Upload image"
              onChange={(e) =>
                setRequest({ ...request, image: e.target.files[0] })
              }
            />
          </Form.Group>

          <Form.Group controlId="file_document" className="mb-3">
            <Form.Label>File document</Form.Label>
            <Form.Control
              type="file"
              id="file_document"
              placeholder="Upload file document"
              onChange={(e) =>
                setRequest({ ...request, file_document: e.target.files[0] })
              }
            />
          </Form.Group>

          {isPending ? (
            <Button variant="primary" type="submit" disabled>
              <Spinner animation="border" size="sm" role="status" /> Saving…
            </Button>
          ) : (
            <Button variant="primary" type="submit">
              Submit
            </Button>
          )}
        </Form>
      </Card>

      <Modal
        show={showAiModal}
        onHide={closeAiModalAndCleanup}
        size="lg"
        centered
        backdrop={promoteLoading ? "static" : true}
        keyboard={!promoteLoading}
      >
        <Modal.Header closeButton={!promoteLoading}>
          <Modal.Title>
            <FontAwesomeIcon icon={faRobot} className="me-2" />
            AI Troubleshooting Steps
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {aiHelpLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2 mb-0">Analyzing your request…</p>
            </div>
          )}
          {!aiHelpLoading && aiHelpError && (
            <p className="text-danger mb-0">{aiHelpError}</p>
          )}
          {!aiHelpLoading && aiHelpContent && (
            <div
              className="text-start"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {aiHelpContent}
            </div>
          )}
          {!aiHelpLoading && (
            <p className="mt-3 mb-0 small text-muted">
              If these steps fixed your issue, choose &quot;Solved by AI&quot;
              (no ticket will be sent). Otherwise choose &quot;Not solved by
              AI&quot; to send this ticket to the support team.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex flex-wrap gap-2">
          <Button
            variant="success"
            onClick={handleSolvedByAi}
            disabled={promoteLoading || aiHelpLoading}
          >
            {promoteLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Please wait…
              </>
            ) : (
              "Solved by AI"
            )}
          </Button>
          <Button
            variant="primary"
            onClick={handleNotSolvedByAi}
            disabled={promoteLoading || aiHelpLoading}
          >
            {promoteLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Submitting…
              </>
            ) : (
              "Not solved by AI"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
