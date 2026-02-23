import React, { useState } from "react";
import { Form, Button, Card, Spinner } from "@themesberg/react-bootstrap";
import { toast } from "react-toastify";

import { addRequest } from "../../api/requestApi";
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
    // priority: "",
    titleRequest: "",
    subjectRequest: "",
    image: "",
    file_document: "",
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPending(true);
    formData.append("userRequest", request.userRequest);
    formData.append("department", request.department);
    formData.append("email", request.email);
    formData.append("type", request.type);
    formData.append("category", request.category);
    formData.append("titleRequest", request.titleRequest);
    formData.append("subjectRequest", request.subjectRequest);
    formData.append("image", request.image);
    formData.append("file_document", request.file_document);

    const sentRequest = await addRequest(formData);

    if (sentRequest.error) {
      toast.error("Oops! Something went wrong! Please try again later.");
    }

    toast.success("Request has been sent!");

    setRequest({
      userRequest: localStorage.getItem("username"),
      department: "",
      email: "",
      type: "",
      category: "",
      // priority: "",
      titleRequest: "",
      subjectRequest: "",
    });
    setIsPending(false);
    history.push(Routes.ListUserRequests.path);

    const createdId = sentRequest?.data?.data?.id;
    const pdfUrl = createdId
      ? `/#/ticketing/render?id=${createdId}`
      : `/#/ticketing/render?user=${request.userRequest}&department=${request.department}&type=${request.type}&category=${request.category}&title=${request.titleRequest}&subject=${request.subjectRequest}`;

    window.open(pdfUrl, "_blank");
    // window.open(
    //   `/#/ticketing/render?user=alwan&department=Finance&category=Install Software&title=request title&subject=lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quaerat! Quasi, quisquam. Quasi, quisquam.`,
    //   "_blank"
    // );
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

          {/* PRIORITY */}
          {/* <Form.Group className="mb-3">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              onChange={(e) =>
                setRequest({ ...request, priority: e.target.value })
              }
            >
              <option defaultValue>Open this select menu</option>
              <option value="Low">Low</option>
              <option value="High">High</option>
            </Form.Select>
          </Form.Group> */}

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
              <Spinner animation="border" size="sm" role="status" /> Sending...
            </Button>
          ) : (
            <Button variant="primary" type="submit">
              Submit
            </Button>
          )}
        </Form>
      </Card>
    </div>
  );
};
