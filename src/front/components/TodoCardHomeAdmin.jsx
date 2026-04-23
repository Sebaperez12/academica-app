
import { RandomImgGroup } from "./RandomImgGroup";

export const TodoCardHomeAdmin = ({ group }) => {

    

    
    return (
        <div className="card shadow-sm h-100 border-0 rounded-4">

            <RandomImgGroup
            
                className="card-img-top rounded-top-4"
                alt="reading"
                style={{ height: "180px", objectFit: "cover" }}
            />

            <div className="card-body d-flex flex-column">

                <h5 className="card-title fw-bold mb-3 text-center">
                    {group.name}
                </h5>

            </div>
        </div>
    );
};
