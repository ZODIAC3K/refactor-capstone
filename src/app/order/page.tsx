"use client";

import { useState, useEffect } from "react";
import {
	FaSearch,
	FaFilter,
	FaSyncAlt,
	FaTimes,
	FaShoppingBag,
	FaRupeeSign,
} from "react-icons/fa";

interface Order {
	id: string;
	customer: {
		name: string;
		email: string;
	};
	product: string;
	total: number;
	date: string;
	status: "Processing" | "Shipped" | "Delivered" | "Refunded";
	payment: {
		status: "Paid" | "Refunded" | "Partially Refunded";
		refundedAmount?: number;
	};
}

export default function OrderManagementPage() {
	// Currency configuration
	const [currency, setCurrency] = useState({
		symbol: "₹",
		code: "INR",
	});

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("All Statuses");
	const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(
		"All Payment Statuses"
	);
	const [showStatusModal, setShowStatusModal] = useState(false);
	const [showRefundModal, setShowRefundModal] = useState(false);
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [refundAmount, setRefundAmount] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
	const ordersPerPage = 5;

	// Sample data that matches the screenshot
	const sampleOrders: Order[] = [
		{
			id: "ORD-001",
			customer: {
				name: "John Doe",
				email: "john@example.com",
			},
			product: "Wireless Headphones",
			total: 129.99,
			date: "2024-03-20",
			status: "Processing",
			payment: { status: "Paid" },
		},
		{
			id: "ORD-002",
			customer: {
				name: "Jane Smith",
				email: "jane@example.com",
			},
			product: "Smart Watch",
			total: 299.99,
			date: "2024-03-19",
			status: "Shipped",
			payment: { status: "Paid" },
		},
		{
			id: "ORD-003",
			customer: {
				name: "Mike Johnson",
				email: "mike@example.com",
			},
			product: "Laptop Stand",
			total: 49.99,
			date: "2024-03-18",
			status: "Delivered",
			payment: { status: "Paid" },
		},
		{
			id: "ORD-004",
			customer: {
				name: "Sarah Wilson",
				email: "sarah@example.com",
			},
			product: "Wireless Mouse",
			total: 79.99,
			date: "2024-03-17",
			status: "Refunded",
			payment: {
				status: "Refunded",
				refundedAmount: 79.99,
			},
		},
		{
			id: "ORD-005",
			customer: {
				name: "Tom Brown",
				email: "tom@example.com",
			},
			product: "Mechanical Keyboard",
			total: 159.99,
			date: "2024-03-16",
			status: "Delivered",
			payment: {
				status: "Partially Refunded",
				refundedAmount: 40.0,
			},
		},
	];

	// For state management
	const [orders, setOrders] = useState<Order[]>(sampleOrders);

	// Filter orders based on search query and selected filters
	useEffect(() => {
		let result = [...orders];

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(order) =>
					order.id.toLowerCase().includes(query) ||
					order.customer.name.toLowerCase().includes(query) ||
					order.customer.email.toLowerCase().includes(query) ||
					order.product.toLowerCase().includes(query)
			);
		}

		// Filter by status
		if (selectedStatus !== "All Statuses") {
			result = result.filter((order) => order.status === selectedStatus);
		}

		// Filter by payment status
		if (selectedPaymentStatus !== "All Payment Statuses") {
			result = result.filter(
				(order) => order.payment.status === selectedPaymentStatus
			);
		}

		setFilteredOrders(result);
		setCurrentPage(1); // Reset to first page when filters change
	}, [searchQuery, selectedStatus, selectedPaymentStatus, orders]);

	// Calculate pagination
	const indexOfLastOrder = currentPage * ordersPerPage;
	const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
	const currentOrders = filteredOrders.slice(
		indexOfFirstOrder,
		indexOfLastOrder
	);
	const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

	const handleStatusUpdate = (newStatus: Order["status"]) => {
		if (selectedOrder) {
			// In a real app, you would make an API call here
			const updatedOrders = orders.map((order) => {
				if (order.id === selectedOrder.id) {
					return { ...order, status: newStatus };
				}
				return order;
			});

			// Update the state (simulating API response)
			setOrders(updatedOrders);
			setShowStatusModal(false);
		}
	};

	const handleRefund = () => {
		if (selectedOrder && refundAmount) {
			const amount = parseFloat(refundAmount);
			if (isNaN(amount) || amount <= 0) {
				alert("Please enter a valid amount");
				return;
			}

			if (amount > selectedOrder.total) {
				alert("Refund amount cannot exceed the order total");
				return;
			}

			// In a real app, you would make an API call here
			const updatedOrders = orders.map((order) => {
				if (order.id === selectedOrder.id) {
					const newPaymentStatus: "Refunded" | "Partially Refunded" =
						amount === selectedOrder.total
							? "Refunded"
							: "Partially Refunded";

					return {
						...order,
						status:
							amount === selectedOrder.total
								? "Refunded"
								: order.status,
						payment: {
							status: newPaymentStatus,
							refundedAmount: amount,
						},
					};
				}
				return order;
			});

			// Update the state (simulating API response)
			setOrders(updatedOrders);
			setRefundAmount("");
			setShowRefundModal(false);
		}
	};

	// CSS classes for status badges
	const getStatusBadgeClass = (status: Order["status"]) => {
		switch (status) {
			case "Processing":
				return "bg-warning text-dark";
			case "Shipped":
				return "bg-info text-white";
			case "Delivered":
				return "bg-success text-white";
			case "Refunded":
				return "bg-secondary text-white";
			default:
				return "bg-secondary";
		}
	};

	// CSS classes for payment status badges
	const getPaymentStatusBadgeClass = (status: Order["payment"]["status"]) => {
		switch (status) {
			case "Paid":
				return "bg-success text-white";
			case "Refunded":
				return "bg-secondary text-white";
			case "Partially Refunded":
				return "bg-info text-white";
			default:
				return "bg-secondary";
		}
	};

	return (
		<div className="bg-dark text-white min-vh-100 p-4">
			<div className="container-fluid">
				{/* Header with white icon and text */}
				<div className="d-flex align-items-center mb-4">
					<div className="me-3">
						<div className="bg-dark p-2 rounded border border-light">
							<FaShoppingBag
								size={32}
								className="text-white"
							/>
						</div>
					</div>
					<div>
						<h1 className="h3 m-0">Manage Orders</h1>
						<p className="text-white-50 m-0">
							View and manage customer orders
						</p>
					</div>
				</div>

				{/* Filter area */}
				<div className="bg-dark p-4 rounded mb-4">
					<div className="row g-3">
						<div className="col-12 col-md-5">
							<div className="input-group">
								<span className="input-group-text bg-dark text-white border-secondary">
									<FaSearch />
								</span>
								<input
									type="text"
									className="form-control bg-dark text-white border-secondary"
									placeholder="Search orders..."
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
								/>
							</div>
						</div>
						<div className="col-12 col-md-3">
							<div className="input-group">
								<span className="input-group-text bg-dark text-white border-secondary">
									<FaFilter />
								</span>
								<select
									className="form-select bg-dark text-white border-secondary"
									value={selectedStatus}
									onChange={(e) =>
										setSelectedStatus(e.target.value)
									}
								>
									<option>All Statuses</option>
									<option>Processing</option>
									<option>Shipped</option>
									<option>Delivered</option>
									<option>Refunded</option>
								</select>
							</div>
						</div>
						<div className="col-12 col-md-4">
							<div className="input-group">
								<span className="input-group-text bg-dark text-white border-secondary">
									<FaRupeeSign />
								</span>
								<select
									className="form-select bg-dark text-white border-secondary"
									value={selectedPaymentStatus}
									onChange={(e) =>
										setSelectedPaymentStatus(e.target.value)
									}
								>
									<option>All Payment Statuses</option>
									<option>Paid</option>
									<option>Refunded</option>
									<option>Partially Refunded</option>
								</select>
							</div>
						</div>
					</div>
				</div>

				{/* Orders table */}
				<div className="table-responsive bg-dark rounded">
					<table className="table table-dark table-hover mb-0">
						<thead>
							<tr className="border-bottom border-secondary">
								<th>Order ID</th>
								<th>Customer</th>
								<th>Product</th>
								<th>Total</th>
								<th>Date</th>
								<th>Status</th>
								<th>Payment</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{currentOrders.length > 0 ? (
								currentOrders.map((order) => (
									<tr
										key={order.id}
										className="border-bottom border-secondary"
									>
										<td>{order.id}</td>
										<td>
											<div>{order.customer.name}</div>
											<div className="text-white-50 small">
												{order.customer.email}
											</div>
										</td>
										<td>{order.product}</td>
										<td>
											{currency.symbol}
											{order.total.toFixed(2)}
										</td>
										<td>
											{new Date(
												order.date
											).toLocaleDateString()}
										</td>
										<td>
											<span
												className={`badge ${getStatusBadgeClass(order.status)}`}
											>
												{order.status}
											</span>
										</td>
										<td>
											<span
												className={`badge ${getPaymentStatusBadgeClass(order.payment.status)}`}
											>
												{order.payment.status}
											</span>
											{order.payment.refundedAmount && (
												<div className="text-white-50 small mt-1">
													Refunded: {currency.symbol}
													{order.payment.refundedAmount.toFixed(
														2
													)}
												</div>
											)}
										</td>
										<td>
											{order.status !== "Refunded" ? (
												<div className="d-flex gap-2">
													<button
														onClick={() => {
															setSelectedOrder(
																order
															);
															setShowStatusModal(
																true
															);
														}}
														className="btn btn-sm btn-dark border-light"
														aria-label="Update status"
													>
														<FaSyncAlt />
													</button>
													<button
														onClick={() => {
															setSelectedOrder(
																order
															);
															setRefundAmount("");
															setShowRefundModal(
																true
															);
														}}
														className="btn btn-sm btn-success"
														aria-label="Process refund"
													>
														<FaRupeeSign />
													</button>
												</div>
											) : (
												<div className="text-white-50">
													No actions available
												</div>
											)}
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={8}
										className="text-center py-4 text-white-50"
									>
										No orders found matching your criteria
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="d-flex justify-content-between align-items-center mt-3 text-white-50">
					<div>
						{filteredOrders.length > 0
							? `Showing ${indexOfFirstOrder + 1} to ${Math.min(
									indexOfLastOrder,
									filteredOrders.length
								)} of ${filteredOrders.length} orders`
							: "No orders found"}
					</div>
					{totalPages > 1 && (
						<div className="d-flex gap-2">
							<button
								className={`btn ${
									currentPage === 1
										? "btn-dark text-muted"
										: "btn-dark text-white"
								}`}
								onClick={() => setCurrentPage(currentPage - 1)}
								disabled={currentPage === 1}
							>
								Previous
							</button>
							{Array.from(
								{ length: totalPages },
								(_, i) => i + 1
							).map((page) => (
								<button
									key={page}
									className={`btn ${
										currentPage === page
											? "btn-success"
											: "btn-dark text-white"
									}`}
									onClick={() => setCurrentPage(page)}
								>
									{page}
								</button>
							))}
							<button
								className={`btn ${
									currentPage === totalPages
										? "btn-dark text-muted"
										: "btn-dark text-white"
								}`}
								onClick={() => setCurrentPage(currentPage + 1)}
								disabled={currentPage === totalPages}
							>
								Next
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Status Update Modal */}
			{showStatusModal && (
				<div
					className="modal fade show d-block"
					tabIndex={-1}
					role="dialog"
					aria-modal="true"
				>
					<div className="modal-dialog modal-dialog-centered">
						<div className="modal-content bg-dark text-white border border-light">
							<div className="modal-header border-0">
								<h5 className="modal-title">
									Update Order Status
								</h5>
								<button
									type="button"
									className="btn-close btn-close-white"
									onClick={() => setShowStatusModal(false)}
								></button>
							</div>
							<div className="modal-body pt-0">
								<div className="list-group list-group-flush bg-dark">
									<button
										onClick={() =>
											handleStatusUpdate("Processing")
										}
										className="list-group-item list-group-item-action bg-dark text-white border-secondary py-3"
									>
										<div className="d-flex align-items-center">
											<span className="badge bg-warning">
												&nbsp;
											</span>
											<span className="ms-2">
												Processing
											</span>
										</div>
									</button>
									<button
										onClick={() =>
											handleStatusUpdate("Shipped")
										}
										className="list-group-item list-group-item-action bg-dark text-white border-secondary py-3"
									>
										<div className="d-flex align-items-center">
											<span className="badge bg-info">
												&nbsp;
											</span>
											<span className="ms-2">
												Shipped
											</span>
										</div>
									</button>
									<button
										onClick={() =>
											handleStatusUpdate("Delivered")
										}
										className="list-group-item list-group-item-action bg-dark text-white border-secondary py-3"
									>
										<div className="d-flex align-items-center">
											<span className="badge bg-success">
												&nbsp;
											</span>
											<span className="ms-2">
												Delivered
											</span>
										</div>
									</button>
									<button
										onClick={() =>
											handleStatusUpdate("Refunded")
										}
										className="list-group-item list-group-item-action bg-dark text-white border-secondary py-3 text-danger"
									>
										<div className="d-flex align-items-center">
											<span className="badge bg-danger">
												&nbsp;
											</span>
											<span className="ms-2">
												Cancel Order
											</span>
										</div>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Refund Modal */}
			{showRefundModal && (
				<div
					className="modal fade show d-block"
					tabIndex={-1}
					role="dialog"
					aria-modal="true"
				>
					<div className="modal-dialog modal-dialog-centered">
						<div className="modal-content bg-dark text-white border border-light">
							<div className="modal-header border-0">
								<h5 className="modal-title">Process Refund</h5>
								<button
									type="button"
									className="btn-close btn-close-white"
									onClick={() => setShowRefundModal(false)}
								></button>
							</div>
							<div className="modal-body">
								<div className="mb-3">
									<label className="form-label text-white">
										Refund Amount
									</label>
									<div className="input-group">
										<span className="input-group-text bg-dark text-white border-secondary">
											{currency.symbol}
										</span>
										<input
											type="number"
											step="0.01"
											min="0.01"
											max={selectedOrder?.total}
											value={refundAmount}
											onChange={(e) =>
												setRefundAmount(e.target.value)
											}
											placeholder="Enter amount"
											className="form-control bg-dark text-white border-secondary"
										/>
									</div>
									{selectedOrder && (
										<small className="text-white-50">
											Maximum refund amount:{" "}
											{currency.symbol}
											{selectedOrder.total.toFixed(2)}
										</small>
									)}
								</div>
							</div>
							<div className="modal-footer border-0">
								<button
									className="btn btn-secondary"
									onClick={() => setShowRefundModal(false)}
								>
									Cancel
								</button>
								<button
									className="btn btn-success"
									onClick={handleRefund}
								>
									Process Refund
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal backdrop */}
			{(showStatusModal || showRefundModal) && (
				<div className="modal-backdrop fade show"></div>
			)}
		</div>
	);
}
