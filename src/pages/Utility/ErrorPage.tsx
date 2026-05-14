import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Import assets - using relative paths from src/pages/Utility to root assets
import error404 from "../../../assets/images/404-error.png";
import error500 from "../../../assets/images/error500.png";
import errorGeneral from "../../../assets/images/error.svg";

interface ErrorPageProps {
    status?: 403 | 404 | 500;
    title?: string;
    message?: string;
}

export default function ErrorPage({ status = 404, title, message }: ErrorPageProps) {
    const navigate = useNavigate();

    const config = {
        403: {
            image: errorGeneral,
            defaultTitle: 'Access Denied',
            defaultMessage: 'Sorry, you do not have permission to access this page.',
            btnClass: 'btn-danger'
        },
        404: {
            image: error404,
            defaultTitle: 'Page Not Found',
            defaultMessage: 'The page you are looking for does not exist or has been moved.',
            btnClass: 'btn-primary'
        },
        500: {
            image: error500,
            defaultTitle: 'Internal Server Error',
            defaultMessage: 'Something went wrong on our end. Please try again later.',
            btnClass: 'btn-info'
        }
    };

    const currentConfig = config[status] || config[404];
    const displayTitle = title || currentConfig.defaultTitle;
    const displayMessage = message || currentConfig.defaultMessage;

    return (
        <div className="auth-page-wrapper py-5 d-flex justify-content-center align-items-center min-vh-100 bg-light">
            <div className="auth-page-content overflow-hidden p-0">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-xl-7 col-lg-8">
                            <div className="text-center">
                                <div className="position-relative">
                                    <img
                                        src={currentConfig.image}
                                        alt="error"
                                        className="img-fluid"
                                        style={{ maxHeight: '400px' }}
                                    />
                                </div>
                                <div className="mt-4">
                                    <h1 className="display-1 fw-bold text-primary mb-0">{status}</h1>
                                    <h3 className="text-uppercase fw-semibold mt-2">{displayTitle}</h3>
                                    <p className="text-muted mb-4 pb-2 fs-16">{displayMessage}</p>
                                    <div className="d-flex gap-2 justify-content-center">
                                        <button
                                            onClick={() => navigate(-1)}
                                            className="btn btn-soft-secondary btn-lg waves-effect waves-light mt-2"
                                        >
                                            <i className="ri-arrow-left-line me-2 align-bottom"></i> Back
                                        </button>
                                        <Link to="/" className={`btn ${currentConfig.btnClass} btn-lg waves-effect waves-light mt-2`}>
                                            <i className="ri-home-4-line me-2 align-bottom"></i> Go to Dashboard
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
