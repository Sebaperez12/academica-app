export const GroupCard = ({ group }) => {
    return (
        <div className="card border shadow-sm" style={{ minWidth: "320px", minHeight: "300px" }}>
            <div className="card-body d-flex flex-column">
                <h5 className="card-title border-bottom pb-2 mb-2 text-center">
                    {group.name}
                </h5>

                <p
                    className="card-text"
                >
                    {group.description}
                </p>
            </div>
        </div>
    );
}