import React from 'react';
import FundingCard from './FundingCard';
import { Link } from 'react-router-dom';
import { FundingSequencingListItem } from '../../../modules/funding/types';

interface FundingGroupData {
    name: string;
    sequencings: FundingSequencingListItem[];
}

interface FundingGroupProps {
    group: FundingGroupData;
}

const FundingGroup = ({ group }: FundingGroupProps) => {
    if (!group.sequencings || group.sequencings.length === 0) return null;

    return (
        <div className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="fs-16 fw-bold mb-0 text-dark">{group.name}</h4>
                <Link to="#" className="text-muted fw-medium fs-13 text-decoration-none">View All <i className="ri-arrow-right-line align-bottom"></i></Link>
            </div>
            <div className="row g-4">
                {group.sequencings.map((item: FundingSequencingListItem) => (
                    <div className="col-xxl-3 col-xl-4 col-lg-6" key={item.id}>
                        <FundingCard item={item} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FundingGroup;
