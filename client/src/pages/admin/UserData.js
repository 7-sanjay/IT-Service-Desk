import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch } from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Card,
  Table,
  Form,
  Button,
  Modal,
  Spinner,
  Row,
  Col,
} from "@themesberg/react-bootstrap";
import { toast } from "react-toastify";

import {
  getAllUserData,
  getAllUserAdmin,
  getAllUserTeam,
  getAllUserHead,
  createUserData,
  deleteUserData,
  updateUserData,
  searchUsers,
} from "../../api/userApi";

export default () => {
  const [listUsers, setListUsers] = useState([]);
  const [showDefault, setShowDefault] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [levelUser, setLevelUser] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const DEPARTMENTS = ["IT", "HR", "Finance", "Sales"];
  const initialUser = {
    id: "",
    full_name: "",
    username: "",
    email: "",
    level: "",
    department: "",
    password: "",
  };
  const [user, setUser] = useState(initialUser);
  const handleClose = () => {
    setShowDefault(false);
    setUser(initialUser);
    setLevelUser(false);
  };
  const listLevel = ["admin", "head", "team", "user"];
  const showDepartment = user.level === "team" || user.level === "head";

  useEffect(() => {
    (async () => {
      const getUsers = await getAllUserData();
      setListUsers(getUsers.data.data);
      setLevelUser(false);
      // if error status code 401 redirect to form login
      if (getUsers.error) {
        window.location.href = "/";
        localStorage.clear();
      }
    })();
  }, []);

  const handleChooseUserType = async (e) => {
    const value = e.target.value;
    if (value === "admin") {
      const getUsers = await getAllUserAdmin();
      setLevelUser(true);
      setListUsers(getUsers.data.data);
    } else if (value === "team") {
      const getUsers = await getAllUserTeam();
      setLevelUser(true);
      setListUsers(getUsers.data.data);
    } else if (value === "head") {
      const getUsers = await getAllUserHead();
      setLevelUser(true);
      setListUsers(getUsers.data.data);
    } else {
      const getUsers = await getAllUserData();
      setLevelUser(false);
      setListUsers(getUsers.data.data);
    }
  };

  const handleChangeUserLevel = (e) => {
    if (
      e.target.value === "admin" ||
      e.target.value === "team" ||
      e.target.value === "head"
    ) {
      setLevelUser(true);
    } else {
      setLevelUser(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    const createUser = await createUserData(user);

    if (createUser.error) {
      toast.error("Create user failed");
    }

    listUsers.push(createUser.data.data);
    setShowDefault(false);
    toast.success("Create user success");
  };

  const handleDeleteUser = async (id, level) => {
    try {
      await deleteUserData(id, level);
      toast.success("Delete user success");

      const newListUsers = listUsers.filter((user) => user.id !== id);
      setListUsers(newListUsers);
    } catch (error) {
      toast.error("Delete user failed :(");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await updateUserData(user.id, user);
      window.location.reload();
      toast.success("Update user successfully!");
    } catch (error) {
      toast.error("Update user failed :(");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const search = await searchUsers(keyword, levelUser);
      setListUsers(search.data.data);
      setKeyword("");
      setIsPending(false);
    } catch (error) {
      console.log(error);
      toast.warning("User not found");
    }
  };

  const userLists = listUsers.map((request) => {
    return (
      <>
        <tr key={request._id || request.id}>
          <td>{request._id || request.id}</td>
          {levelUser ? (
            <td>
              <span className="fw-normal">{request.full_name}</span>
            </td>
          ) : null}
          <td>
            <span className="fw-normal">{request.username}</span>
          </td>
          <td>
            <span className="fw-normal">{request.email}</span>
          </td>
          <td>
            <span className="fw-normal">{request.level}</span>
          </td>
          {levelUser ? (
            <td>
              <span className="fw-normal">
                {request.level === "team" || request.level === "head"
                  ? request.department || "—"
                  : "—"}
              </span>
            </td>
          ) : null}
          <td>
            <div>
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  setUser({
                    id: request._id || request.id,
                    full_name: request.full_name,
                    username: request.username,
                    email: request.email,
                    level: request.level,
                    department: request.department || "",
                    password: "",
                  });
                  setIsUpdate(true);
                  setShowDefault(true);
                  setModalTitle("Update User");
                }}
              >
                {" "}
                Edit{" "}
              </Button>
              <Button
                variant="danger"
                className="ms-2"
                size="sm"
                onClick={() =>
                  handleDeleteUser(request._id || request.id, request.level)
                }
              >
                {" "}
                Delete{" "}
              </Button>
            </div>
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
            <Breadcrumb.Item>Users Data</Breadcrumb.Item>
            <Breadcrumb.Item active>List Users Data</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Users Data</h4>
        </div>
      </div>
      <Row className="pb-3 justify-content-start" md={12}>
        <Col className="d-flex justify-content-start">
          <Button
            variant="secondary"
            onClick={() => {
              setShowDefault(true);
              setModalTitle("Create New User");
            }}
          >
            Create User
          </Button>
          <Form.Group className="ms-3" style={{ width: "200px" }}>
            <Form.Select
              required
              onChange={(e) => {
                handleChooseUserType(e);
              }}
            >
              <option defaultValue>Choose user type</option>
              <option value="admin">admin</option>
              <option value="head">head</option>
              <option value="team">team</option>
              <option value="user">user</option>
            </Form.Select>
          </Form.Group>
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
                <th className="border-bottom">ID</th>
                {levelUser ? (
                  <th className="border-bottom">Full Name</th>
                ) : null}
                <th className="border-bottom">Username</th>
                <th className="border-bottom">Email</th>
                <th className="border-bottom">Level</th>
                {levelUser ? <th className="border-bottom">Department</th> : null}
                <th className="border-bottom">Action</th>
              </tr>
            </thead>
            <tbody>{userLists}</tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal as={Modal.Dialog} centered show={showDefault} onHide={handleClose}>
        <Modal.Header>
          <Modal.Title className="h6"> {modalTitle} </Modal.Title>
          <Button variant="close" aria-label="Close" onClick={handleClose} />
        </Modal.Header>
        <Form
          onSubmit={(e) =>
            isUpdate ? handleUpdateUser(e) : handleCreateUser(e)
          }
        >
          <Modal.Body>
            <Form.Group controlId="levelUser" className="mb-3">
              <Form.Label>User Level</Form.Label>
              <Form.Select
                required
                id="levelUser"
                onChange={(e) => {
                  const level = e.target.value;
                  handleChangeUserLevel(e);
                  setUser({
                    ...user,
                    level,
                    department: level === "team" || level === "head" ? user.department : "",
                  });
                }}
              >
                <option defaultValue>Choose user level</option>
                {listLevel.map((level) => {
                  if (level === user.level) {
                    return (
                      <option value={level} selected>
                        {level}
                      </option>
                    );
                  } else {
                    return <option value={level}>{level}</option>;
                  }
                })}
              </Form.Select>
            </Form.Group>

            {levelUser ? (
              <Form.Group controlId="fullName" className="mb-3">
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  type="text"
                  id="fullName"
                  value={user.full_name}
                  required
                  onChange={(e) =>
                    setUser({ ...user, full_name: e.target.value })
                  }
                />
              </Form.Group>
            ) : null}

            <Form.Group controlId="username" className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                id="username"
                value={user.username}
                required
                onChange={(e) => setUser({ ...user, username: e.target.value })}
              />
            </Form.Group>

            <Form.Group controlId="email" className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                id="email"
                value={user.email}
                required
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            </Form.Group>

            {showDepartment ? (
              <Form.Group controlId="department" className="mb-3">
                <Form.Label>Department</Form.Label>
                <Form.Select
                  required
                  value={user.department || ""}
                  onChange={(e) =>
                    setUser({ ...user, department: e.target.value })
                  }
                >
                  <option value="">Choose department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            ) : null}

            <Form.Group controlId="password" className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                id="password"
                value={user.password}
                placeholder={
                  isUpdate ? "Leave blank to keep current password" : ""
                }
                required={!isUpdate}
                onChange={(e) =>
                  setUser({ ...user, password: e.target.value })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="submit">
              Save
            </Button>
            <Button
              variant="default"
              className="text-gray ms-auto"
              onClick={handleClose}
            >
              Close
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};
