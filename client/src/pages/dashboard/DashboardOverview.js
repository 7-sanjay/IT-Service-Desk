import React, { useEffect, useState } from "react";
import {
  faBars,
  faCheckCircle,
  faClock,
  faExclamationTriangle,
  faFolderOpen,
  faHandHolding,
  faLayerGroup,
  faRobot,
  faTasks,
  faTimesCircle,
  faUser,
  faUserCircle,
  faUsers,
  faUsersCog,
} from "@fortawesome/free-solid-svg-icons";
import { Col, Form, Row } from "@themesberg/react-bootstrap";

import { CounterWidget } from "../../components/Widgets";
import {
  getUserDashboardStats,
  getTeamDashboardStats,
  getHeadDashboardStats,
  getAdminDashboardStats,
} from "../../api/requestApi";
import { getUsersCount, getTeamsCount } from "../../api/userApi";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

export default () => {
  const [usersCount, setUsersCount] = useState(0);
  const [teamsCount, setTeamsCount] = useState(0);

  const [userStats, setUserStats] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [headStats, setHeadStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [kpiRange, setKpiRange] = useState("30d");

  const level = localStorage.getItem("level");
  const history = useHistory();

  const changeLabel =
    kpiRange === "3d"
      ? "vs previous 3 days"
      : kpiRange === "7d"
        ? "vs previous 7 days"
        : "vs previous 30 days";

  useEffect(() => {
    let intervalId;

    const fetchStats = async () => {
      try {
        if (level === "user") {
          const res = await getUserDashboardStats(kpiRange);
          setUserStats(res.data.data);
        } else if (level === "support_engineer" || level === "team") {
          const res = await getTeamDashboardStats(kpiRange);
          setTeamStats(res.data.data);
        } else if (level === "manager" || level === "head") {
          const [headRes, usersRes, teamsRes] = await Promise.all([
            getHeadDashboardStats(kpiRange),
            getUsersCount(),
            getTeamsCount(),
          ]);
          setHeadStats(headRes.data.data);
          setUsersCount(usersRes.data.data);
          setTeamsCount(teamsRes.data.data);
        } else if (level === "admin") {
          const [adminRes, usersRes, teamsRes] = await Promise.all([
            getAdminDashboardStats(kpiRange),
            getUsersCount(),
            getTeamsCount(),
          ]);
          setAdminStats(adminRes.data.data);
          setUsersCount(usersRes.data.data);
          setTeamsCount(teamsRes.data.data);
        }
      } catch (error) {
        console.log(error);
        toast.error("You are not authorized!");
        history.push("/");
      }
    };

    fetchStats();
    intervalId = setInterval(fetchStats, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [history, level, kpiRange]);
  return (
    <div>
      {/* <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <ButtonGroup>
          <Button variant="outline-primary" size="sm">
            Share
          </Button>
          <Button variant="outline-primary" size="sm">
            Export
          </Button>
        </ButtonGroup>
      </div> */}

      <Row className="mt-3 mb-2">
        <Col xs={12} md={4} lg={3}>
          <Form.Group>
            <Form.Label className="mb-1">KPI trend window</Form.Label>
            <Form.Select
              value={kpiRange}
              onChange={(e) => setKpiRange(e.target.value)}
            >
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Since last month (30 days)</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row className="justify-content-md-center mt-5">
        {level === "user" && userStats && (
          <>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Total Tickets"
                title={userStats.totalTickets}
                icon={faLayerGroup}
                iconColor="shape-secondary"
                period="All time"
                percentage={userStats.changes?.totalTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Open Tickets"
                title={userStats.openTickets}
                icon={faFolderOpen}
                iconColor="shape-tertiary"
                period="Realtime"
                percentage={userStats.changes?.openTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Closed Tickets"
                title={userStats.closedTickets}
                icon={faCheckCircle}
                iconColor="shape-success"
                period="Realtime"
                percentage={userStats.changes?.closedTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Pending Approval"
                title={userStats.pendingApproval}
                icon={faHandHolding}
                iconColor="shape-warning"
                period="Realtime"
                percentage={userStats.changes?.pendingApproval ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
          </>
        )}

        {(level === "support_engineer" || level === "team") && teamStats && (
          <>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Tickets Assigned"
                title={teamStats.ticketsAssigned}
                icon={faTasks}
                iconColor="shape-secondary"
                period="Realtime"
                percentage={teamStats.changes?.ticketsAssigned ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="High Priority"
                title={teamStats.highPriorityTickets}
                icon={faExclamationTriangle}
                iconColor="shape-danger"
                period="Realtime"
                percentage={teamStats.changes?.highPriorityTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Tickets Closed"
                title={teamStats.ticketsClosed}
                icon={faCheckCircle}
                iconColor="shape-success"
                period="Realtime"
                percentage={teamStats.changes?.ticketsClosed ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Avg Resolution Time (min)"
                title={teamStats.avgResolutionMinutes}
                icon={faClock}
                iconColor="shape-tertiary"
                period="Last 30 days"
                percentage={teamStats.changes?.avgResolutionMinutes ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
          </>
        )}

        {(level === "manager" || level === "head") && headStats && (
          <>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Total Dept Tickets"
                title={headStats.totalDeptTickets}
                icon={faLayerGroup}
                iconColor="shape-secondary"
                period="All time"
                percentage={headStats.changes?.totalDeptTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Open Tickets"
                title={headStats.openTickets}
                icon={faFolderOpen}
                iconColor="shape-tertiary"
                period="Realtime"
                percentage={headStats.changes?.openTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Closed Tickets"
                title={headStats.closedTickets}
                icon={faCheckCircle}
                iconColor="shape-success"
                period="Realtime"
                percentage={headStats.changes?.closedTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Avg Resolution Time (min)"
                title={headStats.avgResolutionMinutes}
                icon={faClock}
                iconColor="shape-tertiary"
                period="Last 30 days"
                percentage={headStats.changes?.avgResolutionMinutes ?? 0}
                changeLabel={changeLabel}
              />
            </Col>

            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Pending Approval"
                title={headStats.pendingApproval}
                icon={faHandHolding}
                iconColor="shape-warning"
                period="Realtime"
                percentage={headStats.changes?.pendingApproval ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Tickets Assigned"
                title={headStats.ticketsAssigned}
                icon={faTasks}
                iconColor="shape-secondary"
                period="Realtime"
                percentage={headStats.changes?.ticketsAssigned ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Tickets Resolved"
                title={headStats.ticketsResolved}
                icon={faCheckCircle}
                iconColor="shape-success"
                period="Realtime"
                percentage={headStats.changes?.ticketsResolved ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Escalated Tickets"
                title={headStats.escalatedTickets}
                icon={faExclamationTriangle}
                iconColor="shape-danger"
                period="Realtime"
                percentage={headStats.changes?.escalatedTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>

            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Technicians In Work"
                title={headStats.inWork}
                icon={faUsers}
                iconColor="shape-tertiary"
                period="Realtime"
                percentage={headStats.changes?.inWork ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Technicians Free"
                title={headStats.free}
                icon={faUsers}
                iconColor="shape-secondary"
                period="Realtime"
                percentage={headStats.changes?.free ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
          </>
        )}

        {level === "admin" && adminStats && (
          <>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Total Tickets"
                title={adminStats.ticketAnalytics.totalTickets}
                icon={faLayerGroup}
                iconColor="shape-secondary"
                period="All time"
                percentage={adminStats.changes?.totalTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Open Tickets"
                title={adminStats.ticketAnalytics.openTickets}
                icon={faFolderOpen}
                iconColor="shape-tertiary"
                period="Realtime"
                percentage={adminStats.changes?.openTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="In Progress"
                title={adminStats.ticketAnalytics.inProgressTickets}
                icon={faBars}
                iconColor="shape-warning"
                period="Realtime"
                percentage={adminStats.changes?.inProgressTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Closed Tickets"
                title={adminStats.ticketAnalytics.closedTickets}
                icon={faCheckCircle}
                iconColor="shape-success"
                period="Realtime"
                percentage={adminStats.changes?.closedTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>

            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Total Users"
                title={adminStats.userStats.totalUsers}
                icon={faUser}
                iconColor="shape-secondary"
                period="All time"
                percentage={adminStats.changes?.totalUsers ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Technicians"
                title={adminStats.userStats.totalTechnicians}
                icon={faUsersCog}
                iconColor="shape-tertiary"
                period="All time"
                percentage={adminStats.changes?.totalTechnicians ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="Dept Heads"
                title={adminStats.userStats.departmentHeads}
                icon={faUsers}
                iconColor="shape-warning"
                period="All time"
                percentage={adminStats.changes?.departmentHeads ?? 0}
                changeLabel={changeLabel}
              />
            </Col>

            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="AI Resolved Tickets"
                title={adminStats.aiMetrics.aiResolvedTickets}
                icon={faRobot}
                iconColor="shape-success"
                period="All time"
                percentage={adminStats.changes?.aiResolvedTickets ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
            <Col xs={12} sm={6} xl={3} className="mb-4">
              <CounterWidget
                category="AI Success Rate (%)"
                title={adminStats.aiMetrics.aiSuccessRate}
                icon={faRobot}
                iconColor="shape-tertiary"
                period="All time"
                percentage={adminStats.changes?.aiSuccessRate ?? 0}
                changeLabel={changeLabel}
              />
            </Col>
          </>
        )}
      </Row>

      {/* <Row>
        <Col xs={12} xl={12} className="mb-4">
          <Row>
            <Col xs={12} xl={8} className="mb-4">
              <Row>
                <Col xs={12} className="mb-4">
                  <PageVisitsTable />
                </Col>

                <Col xs={12} lg={6} className="mb-4">
                  <TeamMembersWidget />
                </Col>

                <Col xs={12} lg={6} className="mb-4">
                  <ProgressTrackWidget />
                </Col>
              </Row>
            </Col>

            <Col xs={12} xl={4}>
              <Row>
                <Col xs={12} className="mb-4">
                  <BarChartWidget
                    title="Total orders"
                    value={452}
                    percentage={18.2}
                    data={totalOrders}
                  />
                </Col>

                <Col xs={12} className="px-0 mb-4">
                  <RankingWidget />
                </Col>

                <Col xs={12} className="px-0">
                  <AcquisitionWidget />
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
      </Row> */}
    </div>
  );
};
