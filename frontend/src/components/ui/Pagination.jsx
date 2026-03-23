import { ChevronLeftIcon, ChevronRightIcon } from '../Icons'

const Pagination = ({ page, totalPages, onPageChange }) => (
  <div className="pagination">
    <button
      className="pagination__btn"
      disabled={page === 1}
      onClick={() => onPageChange(Math.max(1, page - 1))}
    >
      <ChevronLeftIcon /> Previous
    </button>
    <span className="pagination__info">
      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
    </span>
    <button
      className="pagination__btn"
      disabled={page === totalPages}
      onClick={() => onPageChange(Math.min(totalPages, page + 1))}
    >
      Next <ChevronRightIcon />
    </button>
  </div>
)

export default Pagination
