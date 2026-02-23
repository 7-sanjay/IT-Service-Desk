import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch } from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Row,
  Col,
  Spinner,
} from "@themesberg/react-bootstrap";

import { toast } from "react-toastify";

import { getCategories } from "../../api/requestApi";
import {
  createCategory,
  deleteCategory,
  searchCategory,
} from "../../api/categoryApi";

export default () => {
  const [listCategories, setListCategories] = useState([]);
  const [name, setName] = useState({ category: "" });
  const [keyword, setKeyword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showDefault, setShowDefault] = useState(false);
  const handleClose = () => setShowDefault(false);

  useEffect(() => {
    (async () => {
      const getData = await getCategories();
      setListCategories(getData.data.data);

      // if error status code 401 redirect to form login
      if (getData.error) {
        window.location.href = "/";
        localStorage.clear();
      }
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const saveData = await createCategory(name);

    if (!saveData) {
      toast.error("Error, please try again");
    }

    listCategories.push(saveData.data.data);

    toast.success("Create category success!");
    setShowDefault(false);
  };

  const handleDelete = async (id) => {
    const deleteData = await deleteCategory(id);

    if (!deleteData) {
      toast.error("Error, please try again");
    }

    const newListCategories = listCategories.filter((item) => item.id !== id);

    setListCategories(newListCategories);

    toast.success("Delete category success!");
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const search = await searchCategory(keyword);
      setListCategories(search.data.data);
      setKeyword("");
      setIsPending(false);
    } catch (error) {
      toast.error("Error can't search category!");
    }
  };

  const categoryList = listCategories.map((request) => {
    return (
      <>
        <tr key={request.id}>
          <td>{request.id}</td>
          <td>
            <span className="fw-normal">{request.category}</span>
          </td>
          <td>
            <span className="fw-normal">
              {/* create delete button */}
              <Button
                variant="danger"
                className="m-1"
                size="sm"
                onClick={() => handleDelete(request.id)}
              >
                Delete
              </Button>
            </span>
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
            <Breadcrumb.Item>Categories</Breadcrumb.Item>
            <Breadcrumb.Item active>Data Categories</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Data Categories</h4>
        </div>
      </div>
      <Row className="wrapper justify-between mb-2">
        <Col>
          <Button
            variant="secondary"
            className="m-1"
            onClick={() => setShowDefault(true)}
          >
            Add New
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
                <th className="border-bottom">ID</th>
                <th className="border-bottom">Category name</th>
                <th className="border-bottom">Action</th>
              </tr>
            </thead>
            <tbody>{categoryList}</tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal as={Modal.Dialog} centered show={showDefault} onHide={handleClose}>
        <Modal.Header>
          <Modal.Title className="h6">Add New Category</Modal.Title>
          <Button variant="close" aria-label="Close" onClick={handleClose} />
        </Modal.Header>
        <Form onSubmit={(e) => handleCreate(e)}>
          <Modal.Body>
            <Form.Group controlId="categoryName" className="mb-3">
              <Form.Label>Nama category</Form.Label>
              <Form.Control
                type="text"
                id="categoryName"
                required
                placeholder="Masukkan nama category"
                onChange={(e) => setName({ category: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" type="submit">
              Save
            </Button>
            <Button
              variant="link"
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
