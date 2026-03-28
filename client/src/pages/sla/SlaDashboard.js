import React, { useEffect, useMemo, useState } from "react";
import { Breadcrumb, Button, Card, Col, Form, Row, Table } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import {
  createSlaRule,
  deleteSlaRule,
  getSlaRules,
  getSlaStatus,
  updateSlaRule,
} from "../../api/requestApi";

const emptyForm = { priority: "Low", responseTime: "", resolutionTime: "" };

export default function SlaDashboard() {
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const level = localStorage.getItem("level");
  const canManage = level === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const [rulesRes, statusRes] = await Promise.all([getSlaRules(), getSlaStatus()]);
      setRules(rulesRes.data.data || []);
      setStatus(statusRes.data.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load SLA data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const existingRule = useMemo(
    () => rules.find((r) => String(r.priority).toLowerCase() === form.priority.toLowerCase()),
    [rules, form.priority]
  );

  const saveRule = async (e) => {
    e.preventDefault();
    const payload = {
      priority: form.priority,
      responseTime: Number(form.responseTime),
      resolutionTime: Number(form.resolutionTime),
    };
    try {
      if (existingRule?._id) {
        await updateSlaRule(existingRule._id, payload);
        toast.success("SLA rule updated");
      } else {
        await createSlaRule(payload);
        toast.success("SLA rule created");
      }
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save SLA rule");
    }
  };

  const removeRule = async (id) => {
    if (!window.confirm("Delete this SLA rule?")) return;
    try {
      await deleteSlaRule(id);
      toast.success("SLA rule deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete SLA rule");
    }
  };

  const breachedTickets = status?.breachedTickets || [];

  return (
    <>
      <div className="d-xl-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-xl-0">
          <Breadcrumb className="d-none d-md-inline-block" listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}>
            <Breadcrumb.Item><FontAwesomeIcon icon={faHome} /></Breadcrumb.Item>
            <Breadcrumb.Item active>SLA</Breadcrumb.Item>
          </Breadcrumb>
          <h4>SLA Dashboard</h4>
        </div>
      </div>

      <Row>
        <Col xs={12} md={4} className="mb-4">
          <Card border="light" className="shadow-sm">
            <Card.Body>
              <h6>Total Tickets</h6>
              <h3>{status?.totalTickets ?? 0}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} className="mb-4">
          <Card border="light" className="shadow-sm">
            <Card.Body>
              <h6>SLA Met %</h6>
              <h3>{status?.metPercentage ?? 0}%</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} className="mb-4">
          <Card border="light" className="shadow-sm">
            <Card.Body>
              <h6>SLA Breached %</h6>
              <h3>{status?.breachedPercentage ?? 0}%</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {canManage && (
        <Card border="light" className="shadow-sm mb-4">
          <Card.Body>
            <h5 className="mb-3">Manage SLA Rules</h5>
            <Form onSubmit={saveRule}>
              <Row className="align-items-end">
                <Col md={3}>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>Response Time (min)</Form.Label>
                  <Form.Control type="number" min="1" value={form.responseTime} onChange={(e) => setForm({ ...form, responseTime: e.target.value })} required />
                </Col>
                <Col md={3}>
                  <Form.Label>Resolution Time (min)</Form.Label>
                  <Form.Control type="number" min="1" value={form.resolutionTime} onChange={(e) => setForm({ ...form, resolutionTime: e.target.value })} required />
                </Col>
                <Col md={3}>
                  <Button type="submit" variant="primary">{existingRule ? "Update Rule" : "Create Rule"}</Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Card border="light" className="shadow-sm mb-4">
        <Card.Body>
          <h5 className="mb-3">SLA Rules</h5>
          <Table hover responsive>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Response Time (min)</th>
                <th>Resolution Time (min)</th>
                {canManage ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r._id}>
                  <td>{r.priority}</td>
                  <td>{r.responseTime}</td>
                  <td>{r.resolutionTime}</td>
                  {canManage ? (
                    <td>
                      <Button size="sm" variant="outline-primary" className="me-2" onClick={() => setForm({ priority: r.priority, responseTime: String(r.responseTime), resolutionTime: String(r.resolutionTime) })}>Edit</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => removeRule(r._id)}>Delete</Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card border="light" className="shadow-sm">
        <Card.Body>
          <h5 className="mb-3">Breached Tickets</h5>
          <Table hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Priority</th>
                <th>Response SLA</th>
                <th>Resolution SLA</th>
              </tr>
            </thead>
            <tbody>
              {breachedTickets.map((t) => (
                <tr key={t._id || t.id}>
                  <td>{t._id || t.id}</td>
                  <td>{t.user_request}</td>
                  <td>{t.priority}</td>
                  <td>{t.responseSLA || "-"}</td>
                  <td>{t.resolutionSLA || "-"}</td>
                </tr>
              ))}
              {!loading && breachedTickets.length === 0 ? (
                <tr><td colSpan={5}>No breached tickets</td></tr>
              ) : null}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}
